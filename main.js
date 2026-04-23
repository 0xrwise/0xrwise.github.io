// ════════════════════════════════════════════════════════════════
//  0XRWISE MAIN.JS — FIXED & OPTIMISED
//  Depends on: config.js (loaded before this as plain <script>)
// ════════════════════════════════════════════════════════════════

/* ── Firebase ─────────────────────────────────────────────────── */
let _auth = null, _db = null, _firebaseReady = false;

function initFirebase() {
  if (_firebaseReady) return true;
  try {
    if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    _auth = firebase.auth();
    _db   = firebase.firestore();
    _firebaseReady = true;
    return true;
  } catch (e) {
    console.warn('[0xrwise] Firebase init failed:', e.message);
    return false;
  }
}

/* ════════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════════ */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast' + (isError ? ' error' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

function fileIcon(name, type) {
  if (type === 'dir') return '📁';
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    md:'📄', txt:'📄', js:'⚙️', css:'🎨', html:'🌐',
    json:'📋', enc:'🔒', png:'🖼️', jpg:'🖼️', jpeg:'🖼️',
    gif:'🖼️', svg:'🖼️', pdf:'📕', sh:'💻', py:'🐍',
  };
  return map[ext] || '📄';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ════════════════════════════════════════════════════════════════
   GITHUB API
════════════════════════════════════════════════════════════════ */
function getGHUser() { return localStorage.getItem('__gh_user__') || (window.CONFIG && window.CONFIG.GITHUB_USER) || ''; }
function getGHRepo() { return localStorage.getItem('__gh_repo__') || (window.CONFIG && window.CONFIG.GITHUB_REPO) || ''; }

async function githubRequest(path, options = {}) {
  const base    = `https://api.github.com/repos/${getGHUser()}/${getGHRepo()}`;
  const headers = { 'Accept': 'application/vnd.github.v3+json', ...options.headers };
  const pat     = localStorage.getItem('__gh_pat__');
  if (pat) headers['Authorization'] = `token ${pat}`;
  const res = await fetch(base + path, { ...options, headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function getRawFile(path) {
  const url = `https://raw.githubusercontent.com/${getGHUser()}/${getGHRepo()}/main/${path}`;
  const res = await fetch(url + '?t=' + Date.now());
  if (!res.ok) throw new Error('File tidak ditemukan: ' + path);
  return res.text();
}

/* ════════════════════════════════════════════════════════════════
   PAGE ROUTER
════════════════════════════════════════════════════════════════ */
function showPage(id) {
  ['public-page', 'admin-page', 'viewer-page'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) target.style.display = 'flex';
}

function closeAllOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
}

/* ════════════════════════════════════════════════════════════════
   HASH ROUTER — single source of truth
════════════════════════════════════════════════════════════════ */
function handleRoute() {
  const raw  = window.location.hash.replace('#', '');

  // Secure token routing (dispatched by index.html IIFE)
  if (raw.startsWith('s=')) return; // handled by index.html event dispatcher

  closeAllOverlays();

  if (!raw) {
    showPage('public-page');
    loadPublicDirectory('');
    return;
  }

  if (raw === 'admin') {
    if (isLoggedIn()) { showPage('admin-page'); loadGitHubFilesAdmin(''); }
    else              { showPage('public-page'); document.getElementById('login-overlay')?.classList.add('active'); }
    return;
  }

  if (raw === 'login') {
    showPage('public-page');
    document.getElementById('login-overlay')?.classList.add('active');
    return;
  }

  if (raw === 'about') {
    showPage('public-page');
    document.getElementById('about-overlay')?.classList.add('active');
    startTagline('about-tagline');
    return;
  }

  if (raw.startsWith('file/')) {
    showPage('viewer-page');
    loadFileViewer(raw.slice(5));
    return;
  }

  if (raw.startsWith('dir/')) {
    showPage('public-page');
    loadPublicDirectory(raw.slice(4));
    return;
  }

  // unknown hash → home
  showPage('public-page');
  loadPublicDirectory('');
}

function initRouter() {
  // Listen for secure events from index.html
  document.addEventListener('route:login', () => {
    showPage('public-page');
    closeAllOverlays();
    document.getElementById('login-overlay')?.classList.add('active');
  });

  document.addEventListener('route:admin', () => {
    if (isLoggedIn()) { showPage('admin-page'); loadGitHubFilesAdmin(''); }
    else              { document.dispatchEvent(new CustomEvent('route:login')); }
  });

  document.addEventListener('route:about', () => {
    showPage('public-page');
    closeAllOverlays();
    document.getElementById('about-overlay')?.classList.add('active');
    startTagline('about-tagline');
  });

  document.addEventListener('route:hash', (e) => {
    const hash = (e.detail || '').replace(/^#/, '');
    if (hash.startsWith('file/')) { showPage('viewer-page'); loadFileViewer(hash.slice(5)); return; }
    if (hash.startsWith('dir/'))  { showPage('public-page'); closeAllOverlays(); loadPublicDirectory(hash.slice(4)); return; }
    showPage('public-page'); closeAllOverlays(); loadPublicDirectory('');
  });

  window.addEventListener('hashchange', handleRoute);
}

/* ════════════════════════════════════════════════════════════════
   PUBLIC DIRECTORY LISTING
════════════════════════════════════════════════════════════════ */
async function loadPublicDirectory(path) {
  const tbody = document.getElementById('public-files-body');
  const title = document.getElementById('public-title');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4" style="color:var(--accent);">» Establishing connection...</td></tr>`;
  if (title) title.textContent = 'Index of /' + (path ? path + '/' : '');

  try {
    const items = await githubRequest('/contents/' + path);

    items.sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    const HIDDEN = ['.git','_config.yml','CNAME','LICENSE','README.md','style.css','main.js','config.js','honeypot.js'];
    const hiddenLocalList = getHiddenList();
    const visible = items.filter(i =>
      !HIDDEN.includes(i.name) &&
      !i.name.startsWith('.') &&
      !hiddenLocalList.includes(i.path)
    );

    let html = '';

    if (path) {
      const parent = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      const parentHash = parent ? `dir/${parent}` : '';
      html += `<tr class="parent">
        <td colspan="2"><a href="#${parentHash}" onclick="event.preventDefault();loadPublicDirectory('${parent}');window.location.hash='${parentHash}'">
          📁 <strong>../</strong> <span style="color:var(--text-3);font-size:11px;">Parent Directory</span>
        </a></td>
        <td>—</td><td>—</td>
      </tr>`;
    }

    if (visible.length === 0) {
      html += `<tr><td colspan="4" style="color:var(--text-3);">// Directory kosong</td></tr>`;
    }

    for (const item of visible) {
      const isDir  = item.type === 'dir';
      const icon   = fileIcon(item.name, item.type);
      const size   = isDir ? '—' : formatSize(item.size);
      const isEnc  = item.name.endsWith('.enc');
      const badge  = isEnc
        ? `<span style="color:var(--danger);font-size:10px;border:1px solid var(--danger);padding:1px 5px;margin-left:6px;">🔒 ENC</span>`
        : `<span style="color:var(--accent);font-size:10px;border:1px solid var(--border-lt);padding:1px 5px;margin-left:6px;">PUB</span>`;

      const targetHash = isDir ? `dir/${item.path}` : `file/${item.path}`;
      const onclick    = isDir
        ? `event.preventDefault();loadPublicDirectory('${item.path}');window.location.hash='dir/${item.path}'`
        : `event.preventDefault();loadFileViewer('${item.path}');window.location.hash='file/${item.path}'`;

      html += `<tr>
        <td><a href="#${targetHash}" onclick="${onclick}">${icon} ${item.name}</a></td>
        <td>${size}</td>
        <td class="hide-mobile">${formatDate(item.commit?.author?.date || null)}</td>
        <td>${badge}</td>
      </tr>`;
    }

    tbody.innerHTML = html;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);">[ERR] ${escapeHtml(err.message)}</td></tr>`;
  }
}

/* ════════════════════════════════════════════════════════════════
   FILE VIEWER
════════════════════════════════════════════════════════════════ */
let _currentFileContent = '';
let _currentFilePath    = '';

async function loadFileViewer(filePath) {
  const content   = document.getElementById('viewer-content');
  const titleSpan = document.getElementById('viewer-title');
  if (!content) return;

  _currentFilePath = filePath;
  if (titleSpan) titleSpan.textContent = filePath.split('/').pop();

  content.innerHTML = `<p style="color:var(--accent);padding:20px;">» Loading ${escapeHtml(filePath)}...</p>`;

  try {
    const raw = await getRawFile(filePath);

    if (filePath.endsWith('.enc')) {
      _currentFileContent = raw;
      content.innerHTML = `<div style="padding:30px;text-align:center;">
        <p style="color:var(--danger);font-size:16px;margin-bottom:15px;">🔒 ENCRYPTED PAYLOAD</p>
        <p style="color:var(--text-2);font-size:12px;">File ini terenkripsi AES.</p>
        <button class="btn btn-danger btn-sm" style="margin-top:15px;" onclick="showDecryptOverlay()">[ DECRYPT ]</button>
      </div>`;
      return;
    }

    _currentFileContent = raw;
    renderMarkdown(raw, content);

  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);padding:20px;">[ERR] ${escapeHtml(err.message)}</p>`;
  }
}

function renderMarkdown(raw, container) {
  if (typeof marked === 'undefined') {
    container.innerHTML = `<pre style="padding:20px;white-space:pre-wrap;">${escapeHtml(raw)}</pre>`;
    return;
  }

  if (typeof markedHighlight !== 'undefined' && typeof hljs !== 'undefined') {
    marked.use(markedHighlight.markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    }));
  }

  const dirty = marked.parse(raw);
  const clean = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(dirty) : dirty;
  container.innerHTML = clean;

  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$',  right: '$',  display: false },
      ],
      throwOnError: false
    });
  }
}

/* ── Decrypt overlay ── */
function showDecryptOverlay() {
  document.getElementById('decrypt-overlay')?.classList.add('active');
}

function closeDecryptOverlay() {
  document.getElementById('decrypt-overlay')?.classList.remove('active');
}

function doDecrypt() {
  const key = document.getElementById('decrypt-pw')?.value;
  const err = document.getElementById('decrypt-error');
  if (!key) { if (err) err.textContent = 'Masukkan key!'; return; }
  try {
    const bytes   = CryptoJS.AES.decrypt(_currentFileContent, key);
    const decoded = bytes.toString(CryptoJS.enc.Utf8);
    if (!decoded) throw new Error('Key salah');
    closeDecryptOverlay();
    const content = document.getElementById('viewer-content');
    if (content) renderMarkdown(decoded, content);
  } catch {
    if (err) err.textContent = 'Decryption gagal. Key salah?';
  }
}

/* ════════════════════════════════════════════════════════════════
   AUTH (Firebase)
════════════════════════════════════════════════════════════════ */
function isLoggedIn() {
  return !!sessionStorage.getItem('logged_in');
}

async function doLogin() {
  const email = document.getElementById('username-input')?.value?.trim();
  const pass  = document.getElementById('pw-input')?.value;
  const err   = document.getElementById('login-error');

  if (!email || !pass) { if (err) err.textContent = 'Isi semua field!'; return; }
  if (err) err.textContent = '» Authenticating...';

  const ready = initFirebase();
  if (!ready || !_auth) {
    if (err) err.textContent = '[ERR] Firebase tidak tersedia.';
    return;
  }

  try {
    await _auth.signInWithEmailAndPassword(email, pass);
    sessionStorage.setItem('logged_in', '1');
    closeAllOverlays();
    // Navigate to admin via secure route if available, else direct
    if (typeof window._ROUTE_ADMIN !== 'undefined') {
      window.location.hash = 's=' + window._ROUTE_ADMIN;
    } else {
      window.location.hash = 'admin';
    }
  } catch (e) {
    if (err) err.textContent = '[ERR] ' + (e.message || 'Login gagal');
    // Trigger honeypot on failed login
    if (window.Honeypot && window.Honeypot._sendLoginAlert) {
      window.Honeypot._sendLoginAlert({ meta: { user: email, attempt: 1 } });
    }
  }
}

async function doLogout() {
  try { if (_auth) await _auth.signOut(); } catch {}
  sessionStorage.clear();
  window.location.hash = '';
  showPage('public-page');
  loadPublicDirectory('');
}

/* ════════════════════════════════════════════════════════════════
   SEARCH
════════════════════════════════════════════════════════════════ */
let _allFiles = [];

async function buildSearchIndex(path = '', depth = 0) {
  if (depth > 3) return;
  try {
    const items = await githubRequest('/contents/' + path);
    for (const item of items) {
      if (item.type === 'file') _allFiles.push(item);
      else if (item.type === 'dir') await buildSearchIndex(item.path, depth + 1);
    }
  } catch {}
}

function doSearch(query) {
  const results = document.getElementById('search-results');
  if (!results) return;
  if (!query.trim()) { results.innerHTML = ''; return; }

  const q   = query.toLowerCase();
  const hit = _allFiles.filter(f => f.path.toLowerCase().includes(q)).slice(0, 15);

  if (hit.length === 0) {
    results.innerHTML = `<span style="color:var(--text-3);">// Tidak ditemukan</span>`;
    return;
  }

  results.innerHTML = hit.map(f =>
    `<div style="padding:4px 0;border-bottom:1px dashed var(--border);cursor:pointer;"
          onclick="window.location.hash='file/${f.path}';document.getElementById('search-bar').style.display='none';">
      <span style="color:var(--accent);">${fileIcon(f.name,'file')}</span>
      <span style="color:var(--text);margin-left:6px;">${f.path}</span>
      <span style="color:var(--text-3);font-size:10px;margin-left:8px;">${formatSize(f.size)}</span>
    </div>`
  ).join('');
}

/* ════════════════════════════════════════════════════════════════
   ADMIN — HIDDEN FILES (localStorage)
════════════════════════════════════════════════════════════════ */
function getHiddenList() {
  try { return JSON.parse(localStorage.getItem('__hidden_files__') || '[]'); } catch { return []; }
}
function saveHiddenList(list) {
  localStorage.setItem('__hidden_files__', JSON.stringify(list));
}

window.adminHideFile = function(path) {
  const list = getHiddenList();
  if (!list.includes(path)) { list.push(path); saveHiddenList(list); }
  if (window._lastFileData) renderAdminFiles(window._lastFileData);
  showToast('File hidden from public listing.');
};

window.adminUnhideFile = function(path) {
  saveHiddenList(getHiddenList().filter(p => p !== path));
  if (window._lastFileData) renderAdminFiles(window._lastFileData);
  showToast('File visible in public listing.');
};

window.isFileHidden = function(path) {
  return getHiddenList().includes(path);
};

/* ════════════════════════════════════════════════════════════════
   ADMIN — FILES TAB
════════════════════════════════════════════════════════════════ */
window._currentAdminPath = '';
window._showHiddenFiles  = false;
window._lastFileData     = null;

window.adminToggleShowHidden = function() {
  window._showHiddenFiles = !window._showHiddenFiles;
  const btn = document.getElementById('toggle-hidden-btn');
  if (btn) btn.textContent = window._showHiddenFiles ? '[ HIDE HIDDEN ]' : '[ SHOW HIDDEN ]';
  if (window._lastFileData) renderAdminFiles(window._lastFileData);
};

// Exported so index.html can call it
window.renderAdminFiles = function(files, errMsg) {
  const tbody = document.getElementById('admin-files-body');
  if (!tbody) return;

  // Loading state
  if (files === null) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--accent);font-size:11px;">» Loading...</td></tr>`;
    return;
  }

  if (errMsg) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);">[ERR] ${escapeHtml(errMsg)}</td></tr>`;
    return;
  }

  window._lastFileData = files;
  const hiddenList = getHiddenList();
  let html = '';
  let hiddenCount = 0;

  files.forEach(f => {
    const hidden = hiddenList.includes(f.path);
    if (hidden) hiddenCount++;
    if (hidden && !window._showHiddenFiles) return;

    const isDir    = f.type === 'dir';
    const badge    = hidden ? '<span class="badge badge-hidden">HIDDEN</span>' : '<span class="badge badge-pub">PUB</span>';
    const encBadge = f.name.endsWith('.enc') ? '<span class="badge badge-enc">ENC</span>' : '';
    const rowClass = hidden ? 'class="row-hidden"' : '';
    const sizeStr  = f.size ? (f.size > 1024 ? (f.size/1024).toFixed(1)+'K' : f.size+'B') : '—';

    // Escape path/name for inline onclick attributes
    const safePath = f.path.replace(/'/g, "\\'");
    const safeName = f.name.replace(/'/g, "\\'");

    html += `<tr ${rowClass}>
      <td style="word-break:break-all;">${isDir ? '📁 ' : '📄 '}<strong>${escapeHtml(f.name)}</strong>${badge}${encBadge}</td>
      <td style="font-size:10px;color:#555;word-break:break-all;">${escapeHtml(f.path)}</td>
      <td class="hide-mobile" style="font-size:10px;color:#555;">${sizeStr}</td>
      <td>
        <div class="file-actions">
          ${isDir
            ? `<button onclick="loadGitHubFilesAdmin('${safePath}')">[ CD ]</button>`
            : `<button onclick="adminReadFile('${safePath}','${safeName}')">[ READ ]</button>
               <button onclick="adminEditFile('${safePath}','${safeName}')">[ EDIT ]</button>`
          }
          ${hidden
            ? `<button onclick="adminUnhideFile('${safePath}')">[ SHOW ]</button>`
            : `<button onclick="adminHideFile('${safePath}')">[ HIDE ]</button>`
          }
          <button class="danger" onclick="adminDeleteFileConfirm('${safePath}','${safeName}')">[ DEL ]</button>
        </div>
      </td>
    </tr>`;
  });

  tbody.innerHTML = html || `<tr><td colspan="4" style="color:#444;font-size:11px;">No files in this directory.</td></tr>`;

  // Update stats
  const stFiles   = document.getElementById('stat-files');  if (stFiles)  stFiles.textContent  = files.length;
  const stHidden  = document.getElementById('stat-hidden'); if (stHidden) stHidden.textContent = hiddenCount;
  const stRepo    = document.getElementById('stat-repo');
  if (stRepo) stRepo.textContent = (localStorage.getItem('__gh_user__') || '?') + '/' + (localStorage.getItem('__gh_repo__') || '?');
};

async function loadGitHubFilesAdmin(path) {
  window._currentAdminPath = path;
  const title = document.getElementById('admin-files-title');
  if (title) title.textContent = 'GitHub: /' + (path || '');

  renderAdminFiles(null); // loading state

  try {
    const items = await githubRequest('/contents/' + path);
    items.sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });
    renderAdminFiles(items);
  } catch (err) {
    renderAdminFiles([], err.message);
    showToast('[ERR] ' + err.message, true);
  }
}

// Admin read file via modal
window.adminReadFile = async function(path, name) {
  try {
    const pat  = localStorage.getItem('__gh_pat__')  || '';
    const user = getGHUser();
    const repo = getGHRepo();
    const url  = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;
    const res  = await fetch(url, { headers: { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json' } });
    const data = await res.json();
    const content = atob(data.content.replace(/\n/g, ''));
    if (typeof window.openReadModal === 'function') window.openReadModal(name, content);
  } catch (e) {
    if (typeof window.openReadModal === 'function') window.openReadModal(name, 'ERROR: ' + e.message);
  }
};

// Delete with confirm modal
window.adminDeleteFileConfirm = function(path, name) {
  const msg = `Delete file: ${name}\nPath: ${path}\n\nThis action cannot be undone.`;
  if (typeof window.openConfirmModal === 'function') {
    window.openConfirmModal(msg, () => adminDeleteFile(path, name));
  } else {
    if (confirm(msg)) adminDeleteFile(path, name);
  }
};

/* ── Inline Edit ── */
let _editingSha  = '';
let _editingPath = '';

async function adminEditFile(path, name) {
  _editingPath = path;
  _editingSha  = '';

  const panel = document.getElementById('inline-edit-panel');
  const list  = document.getElementById('tab-files-list');
  const area  = document.getElementById('inline-edit-area');
  const ttl   = document.getElementById('inline-edit-title');

  if (ttl)  ttl.textContent = 'Editing: ' + path;
  if (area) area.value      = '» Loading...';
  if (list)  list.style.display  = 'none';
  if (panel) panel.style.display = 'flex';

  try {
    const meta = await githubRequest('/contents/' + path);
    _editingSha = meta.sha || '';
    const raw = await getRawFile(path);
    if (area) area.value = raw;
  } catch (e) {
    if (area) area.value = '[ERR] ' + e.message;
  }
}

function adminCancelEdit() {
  const panel = document.getElementById('inline-edit-panel');
  const list  = document.getElementById('tab-files-list');
  if (panel) panel.style.display = 'none';
  if (list)  list.style.display  = 'flex';
}

async function adminSaveEdit() {
  const area    = document.getElementById('inline-edit-area');
  const content = area?.value || '';
  const pat     = localStorage.getItem('__gh_pat__');
  if (!pat) { showToast('PAT diperlukan untuk push!', true); return; }

  try {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const body    = {
      message: `${_editingSha ? 'Update' : 'Create'} ${_editingPath} via 0xrwise terminal`,
      content: encoded,
    };
    if (_editingSha) body.sha = _editingSha;

    await githubRequest('/contents/' + _editingPath, {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    showToast(_editingSha ? 'File berhasil disimpan!' : 'File berhasil dibuat!');
    adminCancelEdit();
    loadGitHubFilesAdmin(window._currentAdminPath);
  } catch (err) {
    showToast('[ERR] ' + err.message, true);
  }
}

async function adminDeleteFile(path, name) {
  const pat = localStorage.getItem('__gh_pat__');
  if (!pat) { showToast('PAT diperlukan!', true); return; }
  try {
    const meta = await githubRequest('/contents/' + path);
    await githubRequest('/contents/' + path, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `Delete ${path} via 0xrwise terminal`,
        sha: meta.sha,
      })
    });
    showToast('File dihapus!');
    loadGitHubFilesAdmin(window._currentAdminPath);
  } catch (err) {
    showToast('[ERR] ' + err.message, true);
  }
}

function adminNewFile() {
  const name = prompt('Nama file baru (contoh: notes/intel.md):');
  if (!name) return;
  _editingPath = (window._currentAdminPath ? window._currentAdminPath + '/' : '') + name;
  _editingSha  = '';
  const panel = document.getElementById('inline-edit-panel');
  const list  = document.getElementById('tab-files-list');
  const area  = document.getElementById('inline-edit-area');
  const ttl   = document.getElementById('inline-edit-title');
  if (ttl)  ttl.textContent = 'New: ' + _editingPath;
  if (area) area.value      = '';
  if (list)  list.style.display  = 'none';
  if (panel) panel.style.display = 'flex';
}

function adminNewFolder() {
  const name = prompt('Nama folder baru:');
  if (!name) return;
  _editingPath = (window._currentAdminPath ? window._currentAdminPath + '/' : '') + name + '/.gitkeep';
  _editingSha  = '';
  const area = document.getElementById('inline-edit-area');
  if (area) area.value = '';
  adminSaveEdit();
}

/* ════════════════════════════════════════════════════════════════
   ADMIN — PASTE TAB
════════════════════════════════════════════════════════════════ */
let _publishContent = '';

function initPasteTab() {
  const area   = document.getElementById('paste-area');
  const status = document.getElementById('paste-save-status');
  if (!area) return;

  const draft = localStorage.getItem('0xrwise_draft');
  if (draft) area.value = draft;

  area.addEventListener('input', () => {
    localStorage.setItem('0xrwise_draft', area.value);
    if (status) status.textContent = '// Draft saved locally — ' + new Date().toLocaleTimeString();
  });

  document.getElementById('paste-clear-btn')?.addEventListener('click', () => {
    if (!confirm('Wipe buffer?')) return;
    area.value = '';
    localStorage.removeItem('0xrwise_draft');
    if (status) status.textContent = '// Buffer wiped';
  });

  document.getElementById('paste-publish-btn')?.addEventListener('click', () => {
    _publishContent = area.value;
    document.getElementById('publish-overlay')?.classList.add('active');
  });
}

/* ════════════════════════════════════════════════════════════════
   ADMIN — EDITOR TAB
════════════════════════════════════════════════════════════════ */
function initEditorTab() {
  const input   = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');
  if (!input || !preview) return;

  function updatePreview() { renderMarkdown(input.value, preview); }
  input.addEventListener('input', updatePreview);

  document.querySelectorAll('.tb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (!action) return;
      // image/link/video handled by custom modals in index.html
      if (action === 'image' || action === 'link' || action === 'video') return;

      const start = input.selectionStart;
      const end   = input.selectionEnd;
      const sel   = input.value.substring(start, end);

      const map = {
        'bold':        `**${sel || 'bold'}**`,
        'italic':      `*${sel || 'italic'}*`,
        'strike':      `~~${sel || 'text'}~~`,
        'code-inline': `\`${sel || 'code'}\``,
        'h2':          `## ${sel || 'Heading'}`,
        'h3':          `### ${sel || 'Heading'}`,
        'quote':       `> ${sel || 'quote'}`,
        'ul':          `- ${sel || 'item'}`,
        'ol':          `1. ${sel || 'item'}`,
        'hr':          `\n---\n`,
        'code-block':  `\`\`\`\n${sel || 'code'}\n\`\`\``,
        'math-inline': `$${sel || 'x'}$`,
        'math-block':  `$$\n${sel || 'equation'}\n$$`,
      };

      const ins = map[action];
      if (!ins) return;
      input.setRangeText(ins, start, end, 'end');
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  });

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      if (view === 'split') {
        input.className   = '';
        preview.className = '';
      } else if (view === 'editor') {
        input.className   = 'full';
        preview.className = 'hidden';
      } else {
        input.className   = 'hidden';
        preview.className = 'full';
        updatePreview();
      }
    });
  });

  document.getElementById('blog-publish-btn')?.addEventListener('click', () => {
    _publishContent = input.value;
    document.getElementById('publish-overlay')?.classList.add('active');
  });
}

/* ════════════════════════════════════════════════════════════════
   PUBLISH OVERLAY
════════════════════════════════════════════════════════════════ */
function initPublishOverlay() {
  const privCheck = document.getElementById('pub-private');
  const encFields = document.getElementById('pub-enc-fields');

  privCheck?.addEventListener('change', () => {
    if (encFields) encFields.style.display = privCheck.checked ? 'block' : 'none';
  });

  document.getElementById('pub-ok')?.addEventListener('click', async () => {
    const filename = document.getElementById('pub-filename')?.value?.trim();
    const isEnc    = document.getElementById('pub-private')?.checked;
    const key1     = document.getElementById('pub-enc-key')?.value;
    const key2     = document.getElementById('pub-enc-key2')?.value;
    const errEl    = document.getElementById('pub-error');
    const pat      = localStorage.getItem('__gh_pat__');

    if (!filename) { if (errEl) errEl.textContent = 'Isi nama file!'; return; }
    if (!pat)      { if (errEl) errEl.textContent = 'PAT diperlukan!'; return; }

    let content = _publishContent;
    let path    = filename;

    if (isEnc) {
      if (!key1 || key1.length < 8) { if (errEl) errEl.textContent = 'Key min 8 karakter!'; return; }
      if (key1 !== key2)             { if (errEl) errEl.textContent = 'Key tidak cocok!'; return; }
      content = CryptoJS.AES.encrypt(content, key1).toString();
      if (!path.endsWith('.enc')) path += '.enc';
    }

    if (errEl) errEl.textContent = '» Pushing...';

    try {
      let sha;
      try { const existing = await githubRequest('/contents/' + path); sha = existing.sha; } catch {}

      const encoded = btoa(unescape(encodeURIComponent(content)));
      await githubRequest('/contents/' + path, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Deploy ${path} via 0xrwise terminal`,
          content: encoded,
          ...(sha ? { sha } : {})
        })
      });

      showToast('File berhasil di-deploy!');
      closeAllOverlays();
    } catch (err) {
      if (errEl) errEl.textContent = '[ERR] ' + err.message;
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS TAB (Telegram)
════════════════════════════════════════════════════════════════ */
function initSettingsTab() {
  const tokenInput = document.getElementById('settings-tg-token');
  const chatInput  = document.getElementById('settings-tg-chat');

  if (tokenInput) tokenInput.value = localStorage.getItem('tg_token') || '';
  if (chatInput)  chatInput.value  = localStorage.getItem('tg_chat')  || '';

  document.getElementById('settings-save-btn')?.addEventListener('click', () => {
    localStorage.setItem('tg_token', tokenInput?.value || '');
    localStorage.setItem('tg_chat',  chatInput?.value  || '');
    showToast('Telegram config disimpan!');
  });

  document.getElementById('settings-test-btn')?.addEventListener('click', async () => {
    const token = localStorage.getItem('tg_token');
    const chat  = localStorage.getItem('tg_chat');
    if (!token || !chat) { showToast('Config belum diisi!', true); return; }
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: '🟢 0xrwise Terminal — Test alert OK' })
      });
      showToast('Test alert terkirim!');
    } catch { showToast('Gagal kirim alert!', true); }
  });

  document.getElementById('settings-clear-btn')?.addEventListener('click', () => {
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_chat');
    if (tokenInput) tokenInput.value = '';
    if (chatInput)  chatInput.value  = '';
    showToast('Telegram config dihapus!');
  });
}

/* ════════════════════════════════════════════════════════════════
   TAGLINE TYPEWRITER
════════════════════════════════════════════════════════════════ */
const TAGLINES = [
  'Routing packets, encrypting thoughts, compiling the future.',
  'Access granted. Welcome to the mainframe.',
  'Digital nomad. Knowledge architect.',
  'Hack the planet. One commit at a time.',
  'All systems nominal. Proceed with caution.',
];

function startTagline(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';

  const line   = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  let i        = 0;
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.innerHTML = '&nbsp;';
  el.appendChild(cursor);

  const interval = setInterval(() => {
    if (i >= line.length) { clearInterval(interval); return; }
    cursor.insertAdjacentText('beforebegin', line[i]);
    i++;
  }, 38);
}

/* ════════════════════════════════════════════════════════════════
   ASCII LOGO — visual dots only (navigation handled by index.html)
════════════════════════════════════════════════════════════════ */
function initAsciiLogo() {
  const logo     = document.getElementById('ascii-logo');
  const dotsWrap = document.getElementById('click-dots-wrap');
  if (!logo) return;

  let clicks = 0;

  logo.addEventListener('click', () => {
    clicks++;
    if (dotsWrap) dotsWrap.style.display = 'inline-flex';
    logo.classList.add('clicking');

    for (let i = 1; i <= Math.min(clicks, 5); i++) {
      document.getElementById('d' + i)?.classList.add('filled');
    }

    setTimeout(() => logo.classList.remove('clicking'), 200);

    if (clicks >= 5) {
      clicks = 0;
      setTimeout(() => {
        if (dotsWrap) dotsWrap.style.display = 'none';
        document.querySelectorAll('.click-dot').forEach(d => d.classList.remove('filled'));
      }, 400);
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   CRT TOGGLE
════════════════════════════════════════════════════════════════ */
function initCrtToggle() {
  const btn = document.getElementById('crt-toggle-btn');
  if (!btn) return;
  if (localStorage.getItem('crt') === 'off') document.body.classList.add('crt-off');

  btn.addEventListener('click', () => {
    document.body.classList.toggle('crt-off');
    localStorage.setItem('crt', document.body.classList.contains('crt-off') ? 'off' : 'on');
  });
}

/* ════════════════════════════════════════════════════════════════
   VIEWER BUTTONS
════════════════════════════════════════════════════════════════ */
function initViewerButtons() {
  document.getElementById('viewer-copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(_currentFileContent)
      .then(() => showToast('Copied!'))
      .catch(() => showToast('Copy gagal!', true));
  });

  document.getElementById('viewer-share-btn')?.addEventListener('click', () => {
    const bar = document.getElementById('viewer-share-bar');
    const inp = document.getElementById('viewer-share-url');
    if (!bar) return;
    const showing = bar.style.display === 'flex';
    bar.style.display = showing ? 'none' : 'flex';
    if (!showing && inp) inp.value = window.location.href;
  });

  document.getElementById('viewer-share-copy-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('viewer-share-url');
    navigator.clipboard.writeText(inp?.value || window.location.href)
      .then(() => showToast('URL copied!'))
      .catch(() => showToast('Copy gagal!', true));
  });
}

/* ════════════════════════════════════════════════════════════════
   SEARCH BAR
════════════════════════════════════════════════════════════════ */
function initSearch() {
  const btn   = document.getElementById('nav-search-btn');
  const bar   = document.getElementById('search-bar');
  const input = document.getElementById('search-input');
  const close = document.getElementById('search-close-btn');

  btn?.addEventListener('click', () => {
    if (!bar) return;
    const showing = bar.style.display !== 'none';
    bar.style.display = showing ? 'none' : 'flex';
    if (!showing) {
      input?.focus();
      if (_allFiles.length === 0) buildSearchIndex();
    }
  });

  close?.addEventListener('click', () => { if (bar) bar.style.display = 'none'; });
  input?.addEventListener('input', () => doSearch(input.value));
  input?.addEventListener('keydown', e => { if (e.key === 'Escape' && bar) bar.style.display = 'none'; });
}

/* ════════════════════════════════════════════════════════════════
   ADMIN TABS
════════════════════════════════════════════════════════════════ */
function initAdminTabs() {
  document.querySelectorAll('.admin-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', doLogout);
}

/* ════════════════════════════════════════════════════════════════
   LOGIN / DECRYPT BUTTONS
════════════════════════════════════════════════════════════════ */
function initOverlayButtons() {
  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('pw-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  document.getElementById('decrypt-ok')?.addEventListener('click', doDecrypt);
  document.getElementById('decrypt-pw')?.addEventListener('keydown', e => { if (e.key === 'Enter') doDecrypt(); });

  // Close overlays on backdrop click
  document.querySelectorAll('.overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { closeAllOverlays(); }
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   GLOBAL EXPORTS
════════════════════════════════════════════════════════════════ */
window.loadPublicDirectory  = loadPublicDirectory;
window.loadFileViewer       = loadFileViewer;
window.loadGitHubFilesAdmin = loadGitHubFilesAdmin;
window.adminEditFile        = adminEditFile;
window.adminDeleteFile      = adminDeleteFile;
window.adminCancelEdit      = adminCancelEdit;
window.adminSaveEdit        = adminSaveEdit;
window.adminNewFile         = adminNewFile;
window.adminNewFolder       = adminNewFolder;
window.showDecryptOverlay   = showDecryptOverlay;
window.closeDecryptOverlay  = closeDecryptOverlay;
window.doDecrypt            = doDecrypt;
window.doLogin              = doLogin;
window.doLogout             = doLogout;
window.showToast            = showToast;
window.renderMarkdown       = renderMarkdown;
window.startTagline         = startTagline;
window.formatSize           = formatSize;
window.formatDate           = formatDate;
window.fileIcon             = fileIcon;
window.getRawFile           = getRawFile;
window.githubRequest        = githubRequest;
window.getGHUser            = getGHUser;
window.getGHRepo            = getGHRepo;
window.isLoggedIn           = isLoggedIn;
window.closeAllOverlays     = closeAllOverlays;
window.showPage             = showPage;
window.getHiddenList        = getHiddenList;

/* ════════════════════════════════════════════════════════════════
   BOOT — single DOMContentLoaded, everything in order
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Init Firebase (non-blocking)
  initFirebase();

  // 2. Init secure router (listens for custom events from index.html)
  initRouter();

  // 3. Init UI modules
  initCrtToggle();
  initSearch();
  initAsciiLogo();
  initPasteTab();
  initEditorTab();
  initPublishOverlay();
  initSettingsTab();
  initAdminTabs();
  initOverlayButtons();
  initViewerButtons();

  // 4. Start footer tagline
  startTagline('agent-tagline');

  // 5. Session timer for admin stat bar
  const _sessionStart = Date.now();
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - _sessionStart) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    const el = document.getElementById('stat-session');
    if (el) el.textContent = m + ':' + s;
  }, 1000);

  // 6. Initial route — run AFTER index.html IIFE has registered routes
  // Use setTimeout(0) to let the IIFE in index.html complete first
  setTimeout(handleRoute, 0);

});
