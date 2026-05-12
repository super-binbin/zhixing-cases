/* ============================================
   知行案例库 — 管理页逻辑（拖拽上传版）
   ============================================ */

(function() {
  'use strict';

  // ==========================================
  // 零、管理员密码验证
  // ==========================================

  var DEFAULT_PASSWORD = 'zhixing2026';
  var SESSION_KEY = 'zx_admin_authed';

  // 获取当前密码（存储在 localStorage，首次使用时设为默认密码）
  function getAdminPassword() {
    var pwd = localStorage.getItem('zx_admin_password');
    if (!pwd) {
      pwd = DEFAULT_PASSWORD;
      localStorage.setItem('zx_admin_password', pwd);
    }
    return pwd;
  }

  function doLogin() {
    sessionStorage.setItem(SESSION_KEY, '1');
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('adminPage').style.display = 'block';
    initAdmin(); // 登录后初始化管理功能
  }

  // 检查是否已登录
  if (!sessionStorage.getItem(SESSION_KEY)) {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('adminPage').style.display = 'none';

    document.getElementById('loginBtn').addEventListener('click', function() {
      var input = document.getElementById('loginPassword').value;
      if (input === getAdminPassword()) {
        doLogin();
      } else {
        document.getElementById('loginError').textContent = '密码错误，请重试';
        document.getElementById('loginPassword').value = '';
      }
    });

    document.getElementById('loginPassword').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });

    return; // 等待登录
  }

  // 已登录
  document.getElementById('loginOverlay').classList.add('hidden');
  document.getElementById('adminPage').style.display = 'block';
  initAdmin();

  // ---- 所有初始化逻辑包装在此函数中 ----
  function initAdmin() {

  // ==========================================
  // 一、课程名称编辑
  // ==========================================

  function renderCourseEditTable() {
    const courses = getCourses();
    const tbody = document.getElementById('courseEditBody');

    tbody.innerHTML = courses.map(function(c) {
      return '' +
        '<tr>' +
          '<td><input type="text" value="' + escapeHtml(c.id) + '" class="course-id-input" placeholder="英文ID"></td>' +
          '<td><input type="text" value="' + escapeHtml(c.name) + '" class="course-name-input" placeholder="课程名称"></td>' +
          '<td>' +
            '<input type="color" value="' + c.color + '" class="course-color-input" style="width:40px;height:32px;border:none;cursor:pointer;">' +
            '<span style="margin-left:6px;font-size:12px;">' + c.color + '</span>' +
          '</td>' +
          '<td><button class="btn btn-secondary delete-course-btn" style="padding:6px 14px;font-size:13px;color:#ef4444;border-color:#fecaca;">删除</button></td>' +
        '</tr>';
    }).join('');
  }

  document.getElementById('addCourseBtn').addEventListener('click', function() {
    var tbody = document.getElementById('courseEditBody');
    var row = document.createElement('tr');
    row.innerHTML = '' +
      '<td><input type="text" class="course-id-input" placeholder="如：english-writing"></td>' +
      '<td><input type="text" class="course-name-input" placeholder="输入课程名称"></td>' +
      '<td>' +
        '<input type="color" value="#6366f1" class="course-color-input" style="width:40px;height:32px;border:none;cursor:pointer;">' +
        '<span style="margin-left:6px;font-size:12px;">#6366f1</span>' +
      '</td>' +
      '<td><button class="btn btn-secondary delete-course-btn" style="padding:6px 14px;font-size:13px;color:#ef4444;border-color:#fecaca;">删除</button></td>';
    tbody.appendChild(row);
    var ci = row.querySelector('.course-color-input');
    var cs = row.querySelector('span');
    ci.addEventListener('input', function() { cs.textContent = this.value; });
  });

  document.getElementById('courseEditBody').addEventListener('click', function(e) {
    var delBtn = e.target.closest('.delete-course-btn');
    if (!delBtn) return;
    if (getCourses().length <= 1) { alert('至少保留一门课程！'); return; }
    if (confirm('确定要删除这门课程吗？')) {
      delBtn.closest('tr').remove();
    }
  });

  document.getElementById('saveCourseBtn').addEventListener('click', function() {
    var rows = document.querySelectorAll('#courseEditBody tr');
    var courses = [];
    rows.forEach(function(row) {
      var id = row.querySelector('.course-id-input').value.trim();
      var name = row.querySelector('.course-name-input').value.trim();
      var color = row.querySelector('.course-color-input').value;
      if (id && name) {
        courses.push({ id: id, name: name, color: color, dotColor: color });
      }
    });
    if (courses.length === 0) { alert('至少保留一门课程！'); return; }
    saveCourses(courses);
    showMsg('courseSaveMsg');
    renderCourseSelect();
    renderCourseEditTable();
  });

  // ==========================================
  // 二、课程下拉选项
  // ==========================================

  function renderCourseSelect() {
    var courses = getCourses();
    var html = '';
    courses.forEach(function(c) {
      html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
    });
    document.getElementById('caseCourse').innerHTML = html;
  }

  function setDefaultDate() {
    var today = new Date();
    document.getElementById('caseDate').value =
      today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
  }

  // ==========================================
  // 三、拖拽上传
  // ==========================================

  // 存储结构：{ images: [], videos: [], files: [] }
  // 每项：{ filename, url, size, fileObj }
  var uploadedFiles = { images: [], videos: [], files: [] };

  // 配置三个拖拽区
  var dropConfigs = [
    { id: 'dropImages',   inputId: 'fileInputImages', type: 'images', accept: 'image/*',       maxSize: Infinity, multiple: true  },
    { id: 'dropVideos',   inputId: 'fileInputVideos', type: 'videos', accept: 'video/mp4',      maxSize: Infinity, multiple: true  },
    { id: 'dropFiles',    inputId: 'fileInputFiles',  type: 'files',  accept: '.zip',  maxSize: 45 * 1024 * 1024, multiple: true  }
  ];

  dropConfigs.forEach(function(cfg) {
    var zone = document.getElementById(cfg.id);
    var input = document.getElementById(cfg.inputId);

    // 点击打开文件选择
    zone.addEventListener('click', function() { input.click(); });

    // 文件选择
    input.addEventListener('change', function() {
      addFiles(cfg.type, input.files);
      input.value = '';
    });

    // 拖拽事件
    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function() {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      addFiles(cfg.type, e.dataTransfer.files);
    });
  });

  // 处理文件添加
  function addFiles(type, fileList) {
    Array.from(fileList).forEach(function(file) {
      var cfg = dropConfigs.find(function(c) { return c.type === type; });

      // 校验类型
      if (type === 'videos' && !file.type.match(/^video\//)) {
        alert('仅支持 MP4 视频格式：' + file.name);
        return;
      }
      if (type === 'files' && !file.name.toLowerCase().endsWith('.zip')) {
        alert('仅支持 ZIP 压缩包：' + file.name);
        return;
      }
      if (type === 'images' && !file.type.match(/^image\//)) {
        alert('仅支持图片格式：' + file.name);
        return;
      }

      // 校验大小
      if (file.size > cfg.maxSize) {
        alert('文件 ' + file.name + ' 大小为 ' + formatFileSize(file.size) + '，超过限制 ' + formatFileSize(cfg.maxSize));
        return;
      }

      // 存到 IndexedDB
      var previewUrl = '';
      if (type === 'images') {
        previewUrl = URL.createObjectURL(file);
      }

      uploadedFiles[type].push({
        filename: null,    // 存 IndexedDB 后填充
        url: previewUrl,   // 预览用的临时 URL
        size: file.size,
        fileObj: file,
        saved: false
      });

      // 异步存入 IndexedDB
      var fileEntry = uploadedFiles[type][uploadedFiles[type].length - 1];
      idbSaveFile(file).then(function(result) {
        fileEntry.filename = result.filename;
        fileEntry.saved = true;
        renderPreviews(type);
      }).catch(function(err) {
        console.error('IndexedDB 存储失败:', err);
        fileEntry.saved = false;
        renderPreviews(type);
      });
    });

    renderPreviews(type);
  }

  // 渲染预览列表
  function renderPreviews(type) {
    var container;
    if (type === 'images') container = document.getElementById('previewImages');
    else if (type === 'videos') container = document.getElementById('previewVideos');
    else container = document.getElementById('previewFiles');

    var list = uploadedFiles[type];
    container.innerHTML = list.map(function(item, idx) {
      var sizeClass = (type === 'files' && item.size > 45 * 1024 * 1024) ? ' size-warn' : '';
      var statusIcon = item.saved ? '' : ' ⏳';
      var inner;

      if (type === 'images' && item.url) {
        inner = '<img src="' + item.url + '" alt="">' +
                '<span>' + (item.filename || '存储中...') + '</span>';
      } else {
        var icon = type === 'videos' ? '🎬' : '📦';
        inner = '<span>' + icon + '</span>' +
                '<span>' + (item.filename || item.fileObj.name || '存储中...') + '</span>';
      }

      return '<div class="file-preview-item' + sizeClass + '">' +
        inner +
        '<span class="file-size">' + formatFileSize(item.size) + statusIcon + '</span>' +
        '<span class="remove-file" data-type="' + type + '" data-idx="' + idx + '">&times;</span>' +
        '</div>';
    }).join('');

    // 绑定删除按钮
    container.querySelectorAll('.remove-file').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var t = this.dataset.type;
        var i = parseInt(this.dataset.idx);
        var removed = uploadedFiles[t].splice(i, 1)[0];
        // 释放 URL
        if (removed && removed.url && !removed.saved) {
          URL.revokeObjectURL(removed.url);
        }
        if (removed && removed.filename) {
          idbRemoveFile(removed.filename);
        }
        renderPreviews(t);
      });
    });
  }

  // ==========================================
  // 四、保存案例到 localStorage
  // ==========================================

  function getFilePathList(type) {
    // 优先用拖拽上传的文件
    if (uploadedFiles[type].length > 0) {
      return uploadedFiles[type].map(function(item) {
        if (item.saved && item.filename) {
          return 'idb://' + item.filename;
        }
        return null;
      }).filter(Boolean);
    }

    // 回退到手动输入
    var manualMap = { images: 'caseImagesManual', videos: 'caseVideosManual', files: 'caseFilesManual' };
    var raw = document.getElementById(manualMap[type]).value.trim();
    if (!raw) return [];
    return raw.split(/[,，]/).map(function(s) {
      s = s.trim();
      return s || null;
    }).filter(Boolean);
  }

  document.getElementById('saveCaseBtn').addEventListener('click', function() {
    var courseId = document.getElementById('caseCourse').value;
    var author = document.getElementById('caseAuthor').value.trim();
    var date = document.getElementById('caseDate').value;
    var summary = document.getElementById('caseSummary').value.trim();
    var thoughts = document.getElementById('caseThoughts').value.trim();
    var editId = document.getElementById('editCaseId').value;

    if (!author || !date || !summary) {
      alert('请填写作者、日期和摘要（必填项）');
      return;
    }

    // 检查 IndexedDB 文件是否都保存完成
    var allSaved = true;
    ['images', 'videos', 'files'].forEach(function(t) {
      var unsaved = uploadedFiles[t].filter(function(f) { return !f.saved; });
      if (unsaved.length > 0) allSaved = false;
    });
    if (!allSaved) {
      alert('部分文件还在存储中，请稍候再点保存...');
      return;
    }

    var images = getFilePathList('images');
    var videos = getFilePathList('videos');
    var files = getFilePathList('files');

    var caseObj = {
      id: editId || generateId(),
      courseId: courseId,
      author: author,
      date: date,
      summary: summary,
      thoughts: thoughts,
      images: images,
      videos: videos,
      files: files
    };

    if (editId) {
      // 编辑模式：更新已有案例
      updateCase(editId, caseObj);
    } else {
      // 新增模式
      addCustomCase(caseObj);
    }

    // 显示成功消息
    var saveMsg = document.getElementById('saveMsg');
    saveMsg.style.display = 'inline';
    saveMsg.textContent = editId ? '✅ 修改已保存！刷新主页即可查看' : '✅ 保存成功！刷新主页即可查看';
    setTimeout(function() { saveMsg.style.display = 'none'; }, 3000);

    // 清空表单和编辑状态
    resetEditMode();
    clearForm();

    // 刷新案例列表
    renderCaseList();
  });

  // ==========================================
  // 五、清空表单
  // ==========================================

  function clearForm() {
    document.getElementById('caseAuthor').value = '';
    document.getElementById('caseSummary').value = '';
    document.getElementById('caseThoughts').value = '';
    document.getElementById('caseImagesManual').value = '';
    document.getElementById('caseVideosManual').value = '';
    document.getElementById('caseFilesManual').value = '';

    // 清空上传文件
    ['images', 'videos', 'files'].forEach(function(t) {
      // 只清引用，不删 IndexedDB 里的文件（已保存案例还在用）
      uploadedFiles[t] = [];
      renderPreviews(t);
    });

    setDefaultDate();
  }

  document.getElementById('clearFormBtn').addEventListener('click', function() {
    resetEditMode();
    clearForm();
  });

  // ==========================================
  // 六、案例列表 + 编辑 / 删除
  // ==========================================

  function resetEditMode() {
    document.getElementById('editCaseId').value = '';
    document.getElementById('saveCaseBtn').textContent = '💾 保存案例';
    document.getElementById('editModeLabel').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
  }

  function enterEditMode() {
    document.getElementById('saveCaseBtn').textContent = '💾 更新案例';
    document.getElementById('editModeLabel').style.display = 'inline';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('addSection').scrollIntoView({ behavior: 'smooth' });
  }

  document.getElementById('cancelEditBtn').addEventListener('click', function() {
    resetEditMode();
    clearForm();
  });

  function renderCaseList() {
    var all = getAllCases();
    var container = document.getElementById('caseList');
    document.getElementById('caseCountLabel').textContent = '（共 ' + all.length + ' 条）';

    if (all.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">暂无案例</p>';
      return;
    }

    var courses = getCourses();
    function getCourseName(courseId) {
      var c = courses.find(function(x) { return x.id === courseId; });
      return c ? c.name : courseId;
    }

    container.innerHTML =
      '<table class="case-list-table">' +
        '<thead><tr>' +
          '<th>标题</th><th>作者</th><th>课程</th><th>日期</th><th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          all.map(function(c) {
            return '<tr>' +
              '<td class="cell-title">' + escapeHtml(c.summary) + '</td>' +
              '<td>' + escapeHtml(c.author) + '</td>' +
              '<td>' + escapeHtml(getCourseName(c.courseId)) + '</td>' +
              '<td>' + formatDate(c.date) + '</td>' +
              '<td class="cell-actions">' +
                '<button class="btn-sm btn-edit" data-case-id="' + c.id + '">✏️ 编辑</button>' +
                '<button class="btn-sm btn-del" data-case-id="' + c.id + '">🗑 删除</button>' +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>';

    // 绑定编辑按钮
    container.querySelectorAll('.btn-edit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.caseId;
        var caseData = getCaseById(id);
        if (!caseData) return;

        // 加载到表单
        document.getElementById('editCaseId').value = caseData.id;
        document.getElementById('caseCourse').value = caseData.courseId;
        document.getElementById('caseAuthor').value = caseData.author;
        document.getElementById('caseDate').value = caseData.date;
        document.getElementById('caseSummary').value = caseData.summary;
        document.getElementById('caseThoughts').value = caseData.thoughts || '';

        // 清空上传区（编辑时不恢复文件，用户可重新拖拽）
        ['images', 'videos', 'files'].forEach(function(t) {
          uploadedFiles[t] = [];
          renderPreviews(t);
        });

        // 显示当前文件路径
        document.getElementById('caseImagesManual').value = (caseData.images || []).join(', ');
        document.getElementById('caseVideosManual').value = (caseData.videos || []).join(', ');
        document.getElementById('caseFilesManual').value = (caseData.files || []).join(', ');

        enterEditMode();
      });
    });

    // 绑定删除按钮
    container.querySelectorAll('.btn-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.caseId;
        var caseData = getCaseById(id);
        if (!caseData) return;
        if (!confirm('确定要删除案例「' + caseData.summary + '」吗？此操作不可恢复。')) return;

        deleteCaseById(id);

        // 如果正在编辑被删除的案例，清空表单
        if (document.getElementById('editCaseId').value === id) {
          resetEditMode();
          clearForm();
        }

        renderCaseList();
        alert('已删除，刷新主页后生效。');
      });
    });
  }

  // ==========================================
  // 工具函数
  // ==========================================

  function showMsg(id) {
    var el = document.getElementById(id);
    el.style.display = 'inline';
    setTimeout(function() { el.style.display = 'none'; }, 2000);
  }

  // ==========================================
  // 初始化
  // ==========================================

  // --- 搜索过滤 ---
  document.getElementById('adminSearchInput').addEventListener('input', function() {
    var keyword = this.value.trim().toLowerCase();
    var rows = document.querySelectorAll('.case-list-table tbody tr');
    rows.forEach(function(row) {
      var authorCell = row.querySelector('td:nth-child(2)');
      if (!authorCell) return;
      var author = authorCell.textContent.toLowerCase();
      row.style.display = (keyword === '' || author.indexOf(keyword) >= 0) ? '' : 'none';
    });
  });

  // --- 导出 data.js + 文件（打包成 zip，支持增量） ---
  document.getElementById('exportBtn').addEventListener('click', function() {
    var all = getAllCases();
    var incremental = document.getElementById('incrementalExport').checked;

    // 获取已同步的案例 ID 列表
    var syncedIds = [];
    var syncedData = localStorage.getItem('zx_synced_ids');
    if (syncedData) {
      try { syncedIds = JSON.parse(syncedData); } catch(e) {}
    }

    // 找出未同步的案例 ID
    var unsyncedIds = all.map(function(c) { return c.id; }).filter(function(id) {
      return syncedIds.indexOf(id) === -1;
    });

    // 只收集未同步案例的 idb:// 文件
    var idbFiles = {}; // { idbName: { path, blob } }
    var skippedFiles = 0;

    function convertPath(p, caseId) {
      if (isIdbPath(p)) {
        var name = getIdbName(p);
        var regularPath = idbToRegularPath(p);
        if (incremental && syncedIds.indexOf(caseId) >= 0) {
          // 已同步案例，跳过文件导出
          skippedFiles++;
        } else {
          idbFiles[name] = { path: regularPath, blob: null };
        }
        return regularPath;
      }
      return p;
    }

    function convertList(list, caseId) {
      return (list || []).map(function(p) { return convertPath(p, caseId); });
    }

    var header = '/* ============================================\n' +
      '   知行案例库 — 案例数据\n' +
      '   由管理页导出，可直接替换 GitHub 仓库中的 data.js\n' +
      '   ============================================ */\n\n' +
      'const CASES = [\n';

    var items = all.map(function(c) {
      return '  {\n' +
        "    id: '" + c.id + "',\n" +
        "    courseId: '" + c.courseId + "',\n" +
        "    author: '" + c.author.replace(/'/g, "\\'") + "',\n" +
        "    date: '" + c.date + "',\n" +
        "    summary: '" + c.summary.replace(/'/g, "\\'") + "',\n" +
        "    thoughts: '" + (c.thoughts || '').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "',\n" +
        "    images: [" + convertList(c.images, c.id).map(function(i) { return "'" + i + "'"; }).join(', ') + "],\n" +
        "    videos: [" + convertList(c.videos, c.id).map(function(v) { return "'" + v + "'"; }).join(', ') + "],\n" +
        "    files: [" + convertList(c.files, c.id).map(function(f) { return "'" + f + "'"; }).join(', ') + "]\n" +
        '  }';
    });

    var content = header + items.join(',\n') + '\n];\n';

    var idbNames = Object.keys(idbFiles);

    // 无文件或全部跳过 → 只下载 data.js
    if (idbNames.length === 0) {
      if (incremental && skippedFiles > 0) {
        alert('✅ 所有案例文件已同步过，仅下载 data.js。\n\n' + skippedFiles + ' 个文件被跳过（已同步）。');
      }
      var blob = new Blob([content], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'data.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 标记全部为已同步
      markAllSynced(all);
      return;
    }

    // 有未同步文件 → 打包 zip
    if (typeof JSZip === 'undefined') {
      alert('JSZip 库未加载，请检查网络后刷新重试。');
      return;
    }

    var zip = new JSZip();
    zip.file('data.js', content);

    var promises = idbNames.map(function(name) {
      return idbGetFile(name).then(function(record) {
        if (record && record.blob) {
          var filePath = idbFiles[name].path;
          zip.file(filePath, record.blob);
        }
      }).catch(function() {});
    });

    Promise.all(promises).then(function() {
      zip.generateAsync({ type: 'blob' }).then(function(zipBlob) {
        var zipUrl = URL.createObjectURL(zipBlob);
        var a = document.createElement('a');
        a.href = zipUrl;
        a.download = '知行案例库_导出.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);

        var msg = '✅ 导出完成！\n\nzip 包含：\n- data.js（完整案例数据）\n- ' + idbNames.length + ' 个新文件';
        if (skippedFiles > 0) msg += '\n- 跳过 ' + skippedFiles + ' 个已同步文件';

        alert(msg);

        // 标记全部为已同步
        markAllSynced(all);
      });
    });
  });

  function markAllSynced(all) {
    var ids = all.map(function(c) { return c.id; });
    localStorage.setItem('zx_synced_ids', JSON.stringify(ids));
  }

  // --- 修改密码 ---
  document.getElementById('changePwdBtn').addEventListener('click', function() {
    var newPwd = document.getElementById('newPassword').value.trim();
    if (!newPwd) { alert('请输入新密码'); return; }
    if (newPwd.length < 4) { alert('密码至少 4 位'); return; }
    localStorage.setItem('zx_admin_password', newPwd);
    document.getElementById('newPassword').value = '';
    var msg = document.getElementById('pwdMsg');
    msg.style.display = 'inline';
    setTimeout(function() { msg.style.display = 'none'; }, 2000);
  });

  renderCourseEditTable();
  renderCourseSelect();
  setDefaultDate();
  renderCaseList();

  } // 关闭 initAdmin

})();
