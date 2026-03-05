// ── Apply dark mode INSTANTLY before page renders ─────────────
// Runs in <head> so document.body doesn't exist yet — use <html> element
(function() {
  var saved = getCookie('nightMode');
  if (saved === 'true') {
    document.documentElement.classList.add('dark');
  } else if (!saved) {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
})();

// ── After DOM ready: sync buttons ─────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  updateSwitchLabels();
  document.querySelectorAll('.dark-light-switch').forEach(function(btn) {
    btn.addEventListener('click', handleToggle);
  });
});

// ── Toggle ─────────────────────────────────────────────────────
function handleToggle() {
  var isDark = document.documentElement.classList.contains('dark');
  setCookie('nightMode', isDark ? 'false' : 'true', 365);
  document.documentElement.classList.toggle('dark');
  updateSwitchLabels();
}

function updateSwitchLabels() {
  var isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.dark-light-switch').forEach(function(btn) {
    btn.textContent = isDark ? 'Light' : 'Dark';
  });
}

// ── OS theme change (only if no cookie) ───────────────────────
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
  if (!getCookie('nightMode')) {
    document.documentElement.classList.toggle('dark', e.matches);
    updateSwitchLabels();
  }
});

// ── Cookie helpers ─────────────────────────────────────────────
function setCookie(name, value, days) {
  var expires = '';
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name) {
  var nameEQ = name + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
  }
  return null;
}

// ── Scroll progress bar ────────────────────────────────────────
document.addEventListener('scroll', function() {
  var scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
  var scrollBottom = (document.documentElement.scrollHeight || document.body.scrollHeight)
                     - document.documentElement.clientHeight;
  var pct = scrollBottom > 0 ? (scrollTop / scrollBottom * 100) + '%' : '0%';
  var bar = document.getElementById('_progress');
  if (bar) bar.style.setProperty('--scroll', pct);
}, { passive: true });
