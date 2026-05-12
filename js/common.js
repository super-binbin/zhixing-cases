/* ============================================
   知行案例库 — 公共工具函数
   ============================================ */

// --- 默认课程配置 ---
const DEFAULT_COURSES = [
  { id: 'short-video', name: '短视频剪辑实训', color: '#6366f1', dotColor: '#818cf8' },
  { id: 'xiaohongshu',  name: '小红书带货电商', color: '#ec4899', dotColor: '#f472b6' },
  { id: 'ai-interest',  name: 'AI兴趣激发',     color: '#10b981', dotColor: '#34d399' }
];

// --- 获取课程列表（优先 localStorage） ---
function getCourses() {
  const stored = localStorage.getItem('zx_courses');
  if (stored) {
    try { return JSON.parse(stored); } catch(e) {}
  }
  return DEFAULT_COURSES;
}

// --- 保存课程列表 ---
function saveCourses(courses) {
  localStorage.setItem('zx_courses', JSON.stringify(courses));
}

// --- 根据 courseId 获取课程信息 ---
function getCourseById(id) {
  return getCourses().find(c => c.id === id) || null;
}

// --- 获取所有案例（合并 data.js + 自定义 + 编辑覆盖 - 已删除） ---
function getAllCases() {
  var cases = [];

  // 1. 加载 data.js 中的原始案例
  if (typeof CASES !== 'undefined') {
    cases = cases.concat(CASES);
  }

  // 2. 获取已删除的案例 ID 列表
  var deletedIds = [];
  var deleted = localStorage.getItem('zx_deleted_cases');
  if (deleted) {
    try { deletedIds = JSON.parse(deleted); } catch(e) {}
  }

  // 3. 获取编辑覆盖（针对 data.js 案例的修改）
  var edits = {};
  var edited = localStorage.getItem('zx_edited_cases');
  if (edited) {
    try { edits = JSON.parse(edited); } catch(e) {}
  }

  // 4. 应用编辑覆盖到 data.js 案例，移除被删除的
  cases = cases.map(function(c) {
    if (edits[c.id]) {
      return edits[c.id]; // 用编辑版本替换
    }
    return c;
  }).filter(function(c) {
    return deletedIds.indexOf(c.id) === -1;
  });

  // 5. 合并 localStorage 中的自定义案例
  var stored = localStorage.getItem('zx_custom_cases');
  if (stored) {
    var customCases = [];
    try { customCases = JSON.parse(stored); } catch(e) {}
    // 应用编辑覆盖到自定义案例
    customCases = customCases.map(function(c) {
      if (edits[c.id]) return edits[c.id];
      return c;
    }).filter(function(c) {
      return deletedIds.indexOf(c.id) === -1;
    });
    cases = cases.concat(customCases);
  }

  // 按日期降序
  cases.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  return cases;
}

// --- 添加新案例 ---
function addCustomCase(caseObj) {
  var stored = localStorage.getItem('zx_custom_cases');
  var cases = [];
  if (stored) {
    try { cases = JSON.parse(stored); } catch(e) {}
  }
  cases.push(caseObj);
  localStorage.setItem('zx_custom_cases', JSON.stringify(cases));
}

// --- 编辑案例（自动判断存到哪个存储） ---
function updateCase(caseId, caseObj) {
  // 检查是否在自定义案例中
  var stored = localStorage.getItem('zx_custom_cases');
  var customCases = [];
  if (stored) {
    try { customCases = JSON.parse(stored); } catch(e) {}
  }
  var idx = customCases.findIndex(function(c) { return c.id === caseId; });
  if (idx >= 0) {
    customCases[idx] = caseObj;
    localStorage.setItem('zx_custom_cases', JSON.stringify(customCases));
    return;
  }

  // 不在自定义案例中，则作为 data.js 案例的覆盖编辑
  var edits = {};
  var edited = localStorage.getItem('zx_edited_cases');
  if (edited) {
    try { edits = JSON.parse(edited); } catch(e) {}
  }
  edits[caseId] = caseObj;
  localStorage.setItem('zx_edited_cases', JSON.stringify(edits));
}

// --- 删除案例 ---
function deleteCaseById(caseId) {
  // 从自定义案例中移除
  var stored = localStorage.getItem('zx_custom_cases');
  if (stored) {
    var customCases = [];
    try { customCases = JSON.parse(stored); } catch(e) {}
    customCases = customCases.filter(function(c) { return c.id !== caseId; });
    localStorage.setItem('zx_custom_cases', JSON.stringify(customCases));
  }

  // 加入删除列表（针对 data.js 案例）
  var deletedIds = [];
  var deleted = localStorage.getItem('zx_deleted_cases');
  if (deleted) {
    try { deletedIds = JSON.parse(deleted); } catch(e) {}
  }
  if (deletedIds.indexOf(caseId) === -1) {
    deletedIds.push(caseId);
  }
  localStorage.setItem('zx_deleted_cases', JSON.stringify(deletedIds));

  // 清除编辑覆盖
  var edits = {};
  var edited = localStorage.getItem('zx_edited_cases');
  if (edited) {
    try { edits = JSON.parse(edited); } catch(e) {}
  }
  delete edits[caseId];
  localStorage.setItem('zx_edited_cases', JSON.stringify(edits));

  // 清除关联的 IndexedDB 文件
  var theCase = getAllCasesFromRaw().find(function(c) { return c.id === caseId; });
  if (theCase) {
    ['images', 'videos', 'files'].forEach(function(type) {
      (theCase[type] || []).forEach(function(path) {
        if (isIdbPath(path)) {
          idbRemoveFile(getIdbName(path));
        }
      });
    });
  }
}

// 获取原始案例（不过滤删除）用于管理页编辑
function getAllCasesFromRaw() {
  var cases = [];
  if (typeof CASES !== 'undefined') {
    cases = cases.concat(CASES);
  }
  var stored = localStorage.getItem('zx_custom_cases');
  if (stored) {
    try { cases = cases.concat(JSON.parse(stored)); } catch(e) {}
  }
  return cases;
}

// --- 根据 id 获取单个案例 ---
function getCaseById(id) {
  return getAllCases().find(c => c.id === id) || null;
}

// --- 获取 URL 参数 ---
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// --- 格式化日期 ---
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- 获取文件名 ---
function getFileName(path) {
  return path.split('/').pop();
}

// --- 文件大小可读化 ---
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// --- HTML 转义 ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- 生成唯一 ID ---
function generateId() {
  return 'case-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

// ============================================
// IndexedDB 文件存储（拖拽上传用）
// ============================================

const IDB_NAME = 'zx_case_files';
const IDB_STORE = 'files';
const IDB_PREFIX = 'idb://';

// 判断路径是否为 IndexedDB 存储的文件
function isIdbPath(path) {
  return path && path.startsWith(IDB_PREFIX);
}

// 去掉 idb:// 前缀，取回真实文件名
function getIdbName(path) {
  return path.replace(IDB_PREFIX, '');
}

// 打开数据库
function idbOpen() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'filename' });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function() { reject(req.error); };
  });
}

// 存文件到 IndexedDB
function idbSaveFile(file) {
  return idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      // 生成唯一文件名，保留原始扩展名
      var ext = '';
      var name = file.name || 'file';
      var dotIdx = name.lastIndexOf('.');
      if (dotIdx > 0) ext = name.substring(dotIdx);
      var base = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
      var filename = base + ext;

      var tx = db.transaction(IDB_STORE, 'readwrite');
      var store = tx.objectStore(IDB_STORE);
      var record = {
        filename: filename,
        blob: file,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        addedAt: new Date().toISOString()
      };
      store.put(record);
      tx.oncomplete = function() {
        db.close();
        resolve({ filename: filename, url: idbGetBlobUrlSync(filename, file) });
      };
      tx.onerror = function() { db.close(); reject(tx.error); };
    });
  });
}

// 从 IndexedDB 取文件
function idbGetFile(filename) {
  return idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readonly');
      var store = tx.objectStore(IDB_STORE);
      var req = store.get(filename);
      req.onsuccess = function() {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = function() { db.close(); reject(req.error); };
    });
  });
}

// 获取文件的 Blob URL（带缓存）
var _idbUrlCache = {};
function idbGetBlobUrlSync(filename, blob) {
  if (_idbUrlCache[filename]) {
    URL.revokeObjectURL(_idbUrlCache[filename]);
  }
  var url = URL.createObjectURL(blob);
  _idbUrlCache[filename] = url;
  return url;
}

// 根据路径获取 Blob URL（自动判断 idb:// 还是普通路径）
// idb:// 路径转常规路径（用于 IndexedDB 找不到时回退到服务器文件）
function idbToRegularPath(idbPath) {
  var name = getIdbName(idbPath);
  var ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].indexOf(ext) >= 0) {
    return 'assets/images/' + name;
  }
  if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
    return 'assets/videos/' + name;
  }
  return 'assets/files/' + name;
}

function getFileUrl(path) {
  return new Promise(function(resolve) {
    if (isIdbPath(path)) {
      var name = getIdbName(path);
      if (_idbUrlCache[name]) {
        resolve(_idbUrlCache[name]);
        return;
      }
      idbGetFile(name).then(function(record) {
        if (record) {
          var url = idbGetBlobUrlSync(name, record.blob);
          resolve(url);
        } else {
          // IndexedDB 找不到，回退尝试服务器路径
          resolve(idbToRegularPath(path));
        }
      }).catch(function() {
        // 出错也回退尝试服务器路径
        resolve(idbToRegularPath(path));
      });
    } else {
      resolve(path); // 普通文件路径直接返回
    }
  });
}

// 删除 IndexedDB 中的文件
function idbRemoveFile(filename) {
  if (_idbUrlCache[filename]) {
    URL.revokeObjectURL(_idbUrlCache[filename]);
    delete _idbUrlCache[filename];
  }
  return idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      var store = tx.objectStore(IDB_STORE);
      store.delete(filename);
      tx.oncomplete = function() { db.close(); resolve(); };
      tx.onerror = function() { db.close(); reject(tx.error); };
    });
  });
}
