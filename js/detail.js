/* ============================================
   知行案例库 — 详情页逻辑（支持 IndexedDB）
   ============================================ */

(function() {
  'use strict';

  var caseId = getUrlParam('id');
  var caseData = getCaseById(caseId);

  // --- 案例不存在 ---
  if (!caseData) {
    document.querySelector('.detail-page').innerHTML =
      '<a href="index.html" class="back-link">← 返回案例列表</a>' +
      '<div class="empty-state">' +
        '<div class="empty-icon">🔍</div>' +
        '<p>案例未找到</p>' +
        '<p style="font-size:13px;color:#94a3b8;">ID: ' + escapeHtml(caseId || '无') + '</p>' +
      '</div>';
    return;
  }

  // --- 填充数据 ---
  var course = getCourseById(caseData.courseId);

  document.title = caseData.summary + ' - 知行案例库';
  document.getElementById('detailTitle').textContent = caseData.summary;

  var tagEl = document.getElementById('detailTag');
  if (course) {
    tagEl.textContent = course.name;
    tagEl.className = 'card-tag ' + getTagClassLocal(caseData.courseId);
  }

  document.getElementById('detailAuthor').innerHTML = '👤 ' + escapeHtml(caseData.author);
  document.getElementById('detailDate').innerHTML = '📅 ' + formatDate(caseData.date);

  // 寄语
  if (caseData.thoughts && caseData.thoughts.trim()) {
    document.getElementById('thoughtsSection').style.display = 'block';
    document.getElementById('thoughtsContent').textContent = caseData.thoughts;
  }

  // --- 图片（异步解析 idb:// 路径） ---
  if (caseData.images && caseData.images.length > 0) {
    document.getElementById('imagesSection').style.display = 'block';
    var imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '';

    caseData.images.forEach(function(img) {
      getFileUrl(img).then(function(url) {
        var resolvedUrl = url || img;
        var imgEl = document.createElement('img');
        imgEl.src = resolvedUrl;
        imgEl.alt = '';
        imgEl.loading = 'lazy';
        imgEl.onclick = function() {
          document.getElementById('lightbox').classList.add('show');
          document.querySelector('.lightbox img').src = resolvedUrl;
        };
        imageGrid.appendChild(imgEl);
      });
    });
  }

  // --- 视频（异步解析 idb:// 路径） ---
  if (caseData.videos && caseData.videos.length > 0) {
    document.getElementById('videosSection').style.display = 'block';
    var videoList = document.getElementById('videoList');
    videoList.innerHTML = '';

    caseData.videos.forEach(function(v) {
      getFileUrl(v).then(function(url) {
        var resolvedUrl = url || v;
        var videoEl = document.createElement('video');
        videoEl.className = 'detail-video';
        videoEl.controls = true;
        videoEl.style.marginBottom = '12px';
        var source = document.createElement('source');
        source.src = resolvedUrl;
        source.type = 'video/mp4';
        videoEl.appendChild(source);
        videoEl.appendChild(document.createTextNode('您的浏览器不支持视频播放'));
        videoList.appendChild(videoEl);
      });
    });
  }

  // --- 附件 ---
  if (caseData.files && caseData.files.length > 0) {
    document.getElementById('filesSection').style.display = 'block';
    var fileList = document.getElementById('fileList');

    caseData.files.forEach(function(f, i) {
      var name = getFileName(f);
      var isZip = name.toLowerCase().endsWith('.zip');
      var li = document.createElement('li');
      li.dataset.file = f;
      li.className = isZip ? 'zip-file-item' : '';
      li.innerHTML =
        '<span class="file-icon">' + (isZip ? '📦' : '📄') + '</span>' +
        '<span class="file-name">' + escapeHtml(name) + '</span>' +
        '<span class="file-size">' + (isZip ? '点击预览内容' : '点击下载') + '</span>';
      fileList.appendChild(li);
    });

    fileList.addEventListener('click', function(e) {
      var li = e.target.closest('li');
      if (!li) return;
      var filePath = li.dataset.file;
      var fileName = getFileName(filePath);

      if (fileName.toLowerCase().endsWith('.zip')) {
        previewZip(filePath, fileName);
      } else {
        // 下载（支持 idb://）
        getFileUrl(filePath).then(function(url) {
          var a = document.createElement('a');
          a.href = url || filePath;
          a.download = fileName;
          a.click();
        });
      }
    });
  }

  // --- 灯箱 ---
  var lightbox = document.getElementById('lightbox');
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox || e.target.classList.contains('close-btn')) {
      lightbox.classList.remove('show');
    }
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') lightbox.classList.remove('show');
  });

  // --- ZIP 预览 ---
  var zipModal = document.getElementById('zipModal');
  document.getElementById('zipModalClose').addEventListener('click', function() {
    zipModal.classList.remove('show');
  });
  zipModal.addEventListener('click', function(e) {
    if (e.target === zipModal) zipModal.classList.remove('show');
  });

  function previewZip(filePath, fileName) {
    var modalBody = document.getElementById('zipModalBody');
    document.getElementById('zipModalTitle').textContent = fileName;

    if (typeof JSZip === 'undefined') {
      modalBody.innerHTML = '<p style="color:#ef4444;">JSZip 库加载失败，请检查网络连接后刷新重试。</p>';
      zipModal.classList.add('show');
      return;
    }

    modalBody.innerHTML = '<p style="text-align:center;padding:20px;color:#94a3b8;">⏳ 正在加载压缩包内容...</p>';
    zipModal.classList.add('show');

    // 加载 ZIP 数据（支持 idb:// 和普通路径）
    var loadPromise;
    if (isIdbPath(filePath)) {
      loadPromise = idbGetFile(getIdbName(filePath)).then(function(record) {
        if (!record) throw new Error('文件未在浏览器存储中找到，请重新上传');
        return record.blob.arrayBuffer();
      });
    } else {
      loadPromise = fetch(filePath).then(function(response) {
        if (!response.ok) throw new Error('文件加载失败: ' + response.status);
        return response.arrayBuffer();
      });
    }

    loadPromise.then(function(buffer) {
      return JSZip.loadAsync(buffer);
    }).then(function(zip) {
      var items = [];

      zip.forEach(function(relativePath, file) {
        if (file.dir) {
          items.push({ name: relativePath, isDir: true });
        } else {
          items.push({ name: relativePath, isDir: false, file: file });
        }
      });

      items.sort(function(a, b) {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });

      var html = '<div style="margin-bottom:8px;font-size:12px;color:#94a3b8;">共 ' + items.length + ' 个项目</div>';

      items.forEach(function(item, idx) {
        if (item.isDir) {
          html += '<div class="zip-item" style="color:#6366f1;">📁 ' + escapeHtml(item.name) + '</div>';
        } else {
          html +=
            '<div class="zip-item zip-file-entry" data-idx="' + idx + '">' +
              '<span>📄</span>' +
              '<span style="flex:1;">' + escapeHtml(item.name) + '</span>' +
              '<span style="font-size:12px;color:#94a3b8;">' +
                formatFileSize(item.file._data ? (item.file._data.uncompressedSize || 0) : 0) +
              '</span>' +
            '</div>';
        }
      });

      html += '<div class="zip-preview-content" id="zipPreviewContent" style="display:none;"></div>';
      modalBody.innerHTML = html;

      modalBody.querySelectorAll('.zip-file-entry').forEach(function(entry) {
        entry.addEventListener('click', function() {
          var idx = parseInt(this.dataset.idx);
          var item = items[idx];
          if (!item || item.isDir) return;

          var previewArea = document.getElementById('zipPreviewContent');
          previewArea.style.display = 'block';
          previewArea.innerHTML = '<p style="text-align:center;color:#94a3b8;">⏳ 加载中...</p>';

          var ext = item.name.split('.').pop().toLowerCase();

          item.file.async('string').then(function(content) {
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].indexOf(ext) >= 0) {
              item.file.async('base64').then(function(b64) {
                previewArea.innerHTML = '<img src="data:image/' + ext + ';base64,' + b64 + '" alt="' + escapeHtml(item.name) + '" style="max-width:100%;border-radius:6px;">';
              });
            } else if (['txt', 'md', 'js', 'json', 'css', 'html', 'xml', 'csv'].indexOf(ext) >= 0) {
              var truncated = content.length > 50000 ? content.substring(0, 50000) + '\n\n... (文件过大，仅显示前50000字符)' : content;
              previewArea.innerHTML = '<pre>' + escapeHtml(truncated) + '</pre>';
            } else {
              previewArea.innerHTML = '<p style="color:#94a3b8;">该文件类型（.' + ext + '）不支持在线预览，请下载后查看。</p>';
            }
          }).catch(function() {
            previewArea.innerHTML = '<p style="color:#ef4444;">文件读取失败，可能是加密或损坏的压缩包。</p>';
          });
        });
      });
    }).catch(function(err) {
      modalBody.innerHTML = '<p style="color:#ef4444;">加载失败：' + escapeHtml(err.message) + '</p>';
    });
  }

  function getTagClassLocal(courseId) {
    if (courseId === 'short-video') return 'tag-video';
    if (courseId === 'xiaohongshu') return 'tag-shop';
    if (courseId === 'ai-interest') return 'tag-ai';
    return 'tag-video';
  }

})();
