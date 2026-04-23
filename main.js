// ════════════════════════════════════════════════════════════════
//  0XRWISE MAIN.JS — UPDATED
//  Depends on: config.js (loaded before this as plain <script>)
// ════════════════════════════════════════════════════════════════

/* ── Firebase (loaded via CDN compat scripts in index.html) ─── */
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
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      year:'numeric', month:'short', day:'numeric'
    });
  } catch { return iso.slice(0,10); }
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

/* ════════════════════════════════════════════════════════════════
   GITHUB API
════════════════════════════════════════════════════════════════ */
function getGHUser() {
  return localStorage.getItem('__gh_user__') || CONFIG.GITHUB_USER;
}

function getGHRepo() {
  return localStorage.getItem('__gh_repo__') || CONFIG.GITHUB_REPO;
}

async function githubRequest(path, options = {}) {
  const base    = `https://api.github.com/repos/${getGHUser()}/${getGHRepo()}`;
  const headers = { 'Accept': 'application/vnd.github.v3+json', ...options.headers };

  const pat = localStorage.getItem('__gh_pat__');
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
  ['public-page','admin-page','viewer-page'].forEach(p => {
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
   SECURE ROUTER — listen for custom events dispatched by index.html
════════════════════════════════════════════════════════════════ */
function initRouter() {
  // Login route
  document.addEventListener('route:login', () => {
    showPage('public-page');
    document.getElementById('login-overlay')?.classList.add('active');
  });

  // Admin route (requires auth)
  document.addEventListener('route:admin', () => {
    if (isLoggedIn()) {
      showPage('admin-page');
      loadGitHubFilesAdmin('');
    } else {
      window.location.hash = 'login';
    }
  });

  // About route
  document.addEventListener('route:about', () => {
    showPage('public-page');
    document.getElementById('about-overlay')?.classList.add('active');
    startTagline('about-tagline');
  });

  // Generic hash route — carries the raw hash string in event.detail
  document.addEventListener('route:hash', (e) => {
    const hash = (e.detail || '').replace(/^#/, '');

    // File viewer: file/path/to/file.md
    if (hash.startsWith('file/')) {
      const filePath = hash.slice(5);
      showPage('viewer-page');
      loadFileViewer(filePath);
      return;
    }

    // Directory: dir/some/path
    if (hash.startsWith('dir/')) {
      const dirPath = hash.slice(4);
      showPage('public-page');
      closeAllOverlays();
      loadPublicDirectory(dirPath);
      return;
    }

    // Default: public home
    showPage('public-page');
    closeAllOverlays();
    loadPublicDirectory('');
  });
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
    const visible = items.filter(i => !HIDDEN.includes(i.name) && !i.name.startsWith('.'));

    let html = '';

    if (path) {
      const parent = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      html += `<tr class="parent">
        <td colspan="2"><a href="#dir/${parent}" onclick="event.preventDefault();loadPublicDirectory('${parent}');window.location.hash='dir/${parent}'">
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

      const href = isDir
        ? `href="#dir/${item.path}" onclick="event.preventDefault();loadPublicDirectory('${item.path}');window.location.hash='dir/${item.path}'"`
        : `href="#file/${item.path}" onclick="event.preventDefault();loadFileViewer('${item.path}');window.location.hash='file/${item.path}'"`;

      html += `<tr>
        <td><a ${href}>${icon} ${item.name}</a></td>
        <td>${size}</td>
        <td class="hide-mobile">${formatDate(item.commit?.author?.date || null)}</td>
        <td>${badge}</td>
      </tr>`;
    }

    tbody.innerHTML = html;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);">[ERR] ${err.message}</td></tr>`;
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

  content.innerHTML = `<p style="color:var(--accent);padding:20px;">» Loading ${filePath}...</p>`;

  try {
    const raw = await getRawFile(filePath);

    if (filePath.endsWith('.enc')) {
      _currentFileContent = raw;
      content.innerHTML   = `<div style="padding:30px;text-align:center;">
        <p style="color:var(--danger);font-size:16px;margin-bottom:15px;">🔒 ENCRYPTED PAYLOAD</p>
        <p style="color:var(--text-2);font-size:12px;">File ini terenkripsi AES.</p>
        <button class="btn btn-danger btn-sm" style="margin-top:15px;" onclick="showDecryptOverlay()">[ DECRYPT ]</button>
      </div>`;
      return;
    }

    _currentFileContent = raw;
    renderMarkdown(raw, content);

  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);padding:20px;">[ERR] ${err.message}</p>`;
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

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
    window.location.hash = 'admin';
  } catch (e) {
    if (err) err.textContent = '[ERR] ' + (e.message || 'Login gagal');
  }
}

async function doLogout() {
  try { if (_auth) await _auth.signOut(); } catch {}
  sessionStorage.clear();
  window.location.hash = '';
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
    `<div style="padding:4px 0; border-bottom:1px dashed var(--border); cursor:pointer;"
          onclick="window.location.hash='file/${f.path}';document.getElementById('search-bar').style.display='none';">
      <span style="color:var(--accent);">${fileIcon(f.name,'file')}</span>
      <span style="color:var(--text);margin-left:6px;">${f.path}</span>
      <span style="color:var(--text-3);font-size:10px;margin-left:8px;">${formatSize(f.size)}</span>
    </div>`
  ).join('');
}

/* ════════════════════════════════════════════════════════════════
   ADMIN — FILES TAB
════════════════════════════════════════════════════════════════ */
window._currentAdminPath = '';

async function loadGitHubFilesAdmin(path) {
  window._currentAdminPath = path;

  const title = document.getElementById('admin-files-title');
  if (title) title.textContent = 'GitHub: /' + (path || '');

  // Show loading state if renderAdminFiles supports it
  if (typeof window.renderAdminFiles === 'function') {
    window.renderAdminFiles(null); // null signals loading state
  }

  try {
    const items = await githubRequest('/contents/' + path);
    items.sort((a,b) => {
      if (a.type==='dir' && b.type!=='dir') return -1;
      if (a.type!=='dir' && b.type==='dir') return 1;
      return a.name.localeCompare(b.name);
    });

    if (typeof window.renderAdminFiles === 'function') {
      window.renderAdminFiles(items);
    }
  } catch (err) {
    if (typeof window.renderAdminFiles === 'function') {
      window.renderAdminFiles([], err.message);
    }
    showToast('[ERR] ' + err.message, true);
  }
}

let _editingSha  = '';
let _editingPath = '';

async function adminEditFile(path, name) {
  _editingPath = path;
  _editingSha  = ''; // will be fetched fresh

  const panel = document.getElementById('inline-edit-panel');
  const list  = document.getElementById('tab-files-list');
  const area  = document.getElementById('inline-edit-area');
  const ttl   = document.getElementById('inline-edit-title');

  if (ttl)  ttl.textContent = 'Editing: ' + path;
  if (area) area.value      = '» Loading...';
  if (list)  list.style.display  = 'none';
  if (panel) panel.style.display = 'flex';

  try {
    // Fetch fresh SHA from API
    const meta = await githubRequest('/contents/' + path);
    _editingSha = meta.sha || '';

    const raw = await getRawFile(path);
    if (area) area.value = raw;
  } catch (e) {
    if (area) area.value = '[ERR] ' + e.message;
  }
}

function adminCancelEdit() {
  document.getElementById('inline-edit-panel').style.display = 'none';
  document.getElementById('tab-files-list').style.display    = 'flex';
}

// Unified save: create if no SHA, update if SHA present
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
  const label = name || path;
  const msg   = `Hapus file "${label}"?`;

  const doDelete = async () => {
    const pat = localStorage.getItem('__gh_pat__');
    if (!pat) { showToast('PAT diperlukan!', true); return; }

    try {
      // Fetch fresh SHA before delete
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
  };

  if (typeof window.openConfirmModal === 'function') {
    window.openConfirmModal(msg, doDelete);
  } else {
    if (confirm(msg)) doDelete();
  }
}

function adminNewFile() {
  const openModal = (defaultName = '') => {
    if (typeof window.openConfirmModal === 'function') {
      // Use the custom modal — index.html provides #new-file-modal if available
      const modal = document.getElementById('new-file-modal');
      if (modal) {
        modal.classList.add('active');
        const input = modal.querySelector('input[data-role="filename"]');
        if (input) {
          input.value = defaultName;
          input.focus();
        }
        return;
      }
      // Fallback: openConfirmModal with an input prompt pattern
    }
    // Native fallback
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
  };

  openModal();
}

function adminConfirmNewFile(name) {
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
  const createFolder = (name) => {
    if (!name) return;
    const path = (window._currentAdminPath ? window._currentAdminPath + '/' : '') + name + '/.gitkeep';
    _editingPath = path;
    _editingSha  = '';
    const area = document.getElementById('inline-edit-area');
    if (area) area.value = '';
    adminSaveEdit();
  };

  if (typeof window.openConfirmModal === 'function') {
    const modal = document.getElementById('new-file-modal');
    if (modal) {
      modal.classList.add('active');
      const input = modal.querySelector('input[data-role="filename"]');
      if (input) {
        input.value = '';
        input.placeholder = 'Nama folder baru';
        input.focus();
        // Override confirm action for folder creation
        modal.dataset.mode = 'folder';
        return;
      }
    }
  }
  // Native fallback
  const name = prompt('Nama folder baru:');
  createFolder(name);
}

/* ════════════════════════════════════════════════════════════════
   ADMIN — PASTE TAB
════════════════════════════════════════════════════════════════ */
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
   ADMIN — EDITOR TAB (Markdown)
════════════════════════════════════════════════════════════════ */
function initEditorTab() {
  const input   = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');
  if (!input || !preview) return;

  function updatePreview() {
    renderMarkdown(input.value, preview);
  }

  input.addEventListener('input', updatePreview);

  document.querySelectorAll('.tb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const start  = input.selectionStart;
      const end    = input.selectionEnd;
      const sel    = input.value.substring(start, end);
      let   ins    = sel;

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

      if (action === 'image') {
        if (typeof window.openImgModal === 'function') {
          window.openImgModal((url, alt) => {
            if (url) {
              ins = `![${alt || sel || 'alt'}](${url})`;
              input.setRangeText(ins, start, end, 'end');
              input.dispatchEvent(new Event('input'));
              input.focus();
            }
          });
          return;
        }
        const url = prompt('URL gambar:');
        if (url) ins = `![${sel || 'alt'}](${url})`;
        else return;
      } else if (action === 'video') {
        if (typeof window.openVideoModal === 'function') {
          window.openVideoModal((url) => {
            if (url) {
              const id = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
              ins = id
                ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`
                : url;
              input.setRangeText(ins, start, end, 'end');
              input.dispatchEvent(new Event('input'));
              input.focus();
            }
          });
          return;
        }
        const url = prompt('YouTube URL:');
        if (url) {
          const id = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
          ins = id ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>` : url;
        } else return;
      } else if (action === 'link') {
        if (typeof window.openLinkModal === 'function') {
          window.openLinkModal((url, text) => {
            if (url) {
              ins = `[${text || sel || 'link'}](${url})`;
              input.setRangeText(ins, start, end, 'end');
              input.dispatchEvent(new Event('input'));
              input.focus();
            }
          });
          return;
        }
        const url = prompt('URL:');
        if (url) ins = `[${sel || 'link'}](${url})`;
        else return;
      } else {
        ins = map[action] || sel;
      }

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
let _publishContent = '';

function initPublishOverlay() {
  const privCheck  = document.getElementById('pub-private');
  const encFields  = document.getElementById('pub-enc-fields');

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
      try {
        const existing = await githubRequest('/contents/' + path);
        sha = existing.sha;
      } catch {}

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
      window.history.back();
    } catch (err) {
      if (errEl) errEl.textContent = '[ERR] ' + err.message;
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS TAB (Telegram only — GitHub & brand handled by index.html)
════════════════════════════════════════════════════════════════ */
function initSettingsTab() {
  const tokenInput = document.getElementById('settings-tg-token');
  const chatInput  = document.getElementById('settings-tg-chat');
  const statusEl   = document.getElementById('settings-tg-status');

  // Load saved Telegram config
  if (tokenInput) tokenInput.value = localStorage.getItem('tg_token') || '';
  if (chatInput)  chatInput.value  = localStorage.getItem('tg_chat')  || '';

  if (statusEl) {
    const t = localStorage.getItem('tg_token');
    const c = localStorage.getItem('tg_chat');
    const p = localStorage.getItem('__gh_pat__');
    statusEl.innerHTML = (t && c)
      ? `<span style="color:var(--accent);">● CONFIGURED</span><br>Chat ID: ${c}${p ? '<br><span style="color:var(--text-3);font-size:10px;">PAT: ••••••••' + p.slice(-4) + '</span>' : ''}`
      : `<span style="color:var(--text-3);">● NOT SET</span>${p ? '<br><span style="color:var(--accent);font-size:10px;">PAT: ••••••••' + p.slice(-4) + '</span>' : ''}`;
  }

  document.getElementById('settings-save-btn')?.addEventListener('click', () => {
    localStorage.setItem('tg_token', tokenInput?.value || '');
    localStorage.setItem('tg_chat',  chatInput?.value  || '');
    showToast('Telegram config disimpan!');
    if (window.CONFIG?.TELEGRAM) {
      window.CONFIG.TELEGRAM.ENABLED = !!(tokenInput?.value && chatInput?.value);
    }
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

  const line = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  let i = 0;

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
   ASCII LOGO — visual dots only, navigation handled by index.html
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

    // Reset dots after 5 clicks — navigation is handled by secure router in index.html
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
  const saved = localStorage.getItem('crt') === 'off';
  if (saved) document.body.classList.add('crt-off');

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
      if (_allFiles.length === 0) buildSearchIndex().then(() => {});
    }
  });

  close?.addEventListener('click', () => {
    if (bar) bar.style.display = 'none';
  });

  input?.addEventListener('input', () => doSearch(input.value));
  input?.addEventListener('keydown', e => {
    if (e.key === 'Escape' && bar) bar.style.display = 'none';
  });
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
  document.getElementById('pw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  document.getElementById('decrypt-ok')?.addEventListener('click', doDecrypt);
  document.getElementById('decrypt-pw')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doDecrypt();
  });

  // Close overlays on backdrop click
  document.querySelectorAll('.overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) window.history.back();
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   GLOBAL EXPORTS
════════════════════════════════════════════════════════════════ */
window.loadPublicDirectory    = loadPublicDirectory;
window.loadFileViewer         = loadFileViewer;
window.loadGitHubFilesAdmin   = loadGitHubFilesAdmin;
window.adminEditFile          = adminEditFile;
window.adminDeleteFile        = adminDeleteFile;
window.adminCancelEdit        = adminCancelEdit;
window.adminSaveEdit          = adminSaveEdit;
window.adminNewFile           = adminNewFile;
window.adminNewFolder         = adminNewFolder;
window.adminConfirmNewFile    = adminConfirmNewFile;
window.showDecryptOverlay     = showDecryptOverlay;
window.closeDecryptOverlay    = closeDecryptOverlay;
window.doDecrypt              = doDecrypt;
window.doLogin                = doLogin;
window.doLogout               = doLogout;
window.showToast              = showToast;
window.renderMarkdown         = renderMarkdown;
window.startTagline           = startTagline;
window.formatSize             = formatSize;
window.formatDate             = formatDate;
window.fileIcon               = fileIcon;
window.getRawFile             = getRawFile;
window.githubRequest          = githubRequest;
window.getGHUser              = getGHUser;
window.getGHRepo              = getGHRepo;
window.isLoggedIn             = isLoggedIn;
window.closeAllOverlays       = closeAllOverlays;
window.showPage               = showPage;

/* ════════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // ... semua init yang ada ...

  startTagline('agent-tagline');

  // ─── FALLBACK ROUTER ───────────────────────────────────────────
  // Jika index.html belum dispatch route event, handle hash manual
  const hash = window.location.hash.slice(1);
  if (hash === 'login') {
    showPage('public-page');
    document.getElementById('login-overlay')?.classList.add('active');
  } else if (hash === 'about') {
    showPage('public-page');
    document.getElementById('about-overlay')?.classList.add('active');
    startTagline('about-tagline');
  } else if (hash === 'admin') {
    isLoggedIn() ? (showPage('admin-page'), loadGitHubFilesAdmin(''))
                 : (window.location.hash = 'login');
  } else if (hash.startsWith('file/')) {
    showPage('viewer-page');
    loadFileViewer(hash.slice(5));
  } else if (hash.startsWith('dir/')) {
    showPage('public-page');
    loadPublicDirectory(hash.slice(4));
  } else {
    // Default: public home
    showPage('public-page');
    loadPublicDirectory('');
  }

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.slice(1);
    if (h.startsWith('file/')) { showPage('viewer-page'); loadFileViewer(h.slice(5)); }
    else if (h.startsWith('dir/')) { showPage('public-page'); loadPublicDirectory(h.slice(4)); }
    else if (h === 'admin') { isLoggedIn() ? (showPage('admin-page'), loadGitHubFilesAdmin('')) : (window.location.hash = 'login'); }
    else if (h === 'login') { showPage('public-page'); document.getElementById('login-overlay')?.classList.add('active'); }
    else { showPage('public-page'); closeAllOverlays(); loadPublicDirectory(''); }
  });
});

  // Init Firebase (non-blocking)
  initFirebase();

  // Init secure router (listens for custom events from index.html)
  initRouter();

  // Init all UI modules
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

  // Start tagline on public page footer
  startTagline('agent-tagline');
});
