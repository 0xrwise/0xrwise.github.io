// ════════════════════════════════════════════════════════════════
//  0XRWISE HONEYPOT MODULE v3.0 - ADVANCED IDS
//  File: assets/honeypot.js
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const CFG    = (typeof window.CONFIG !== 'undefined') ? window.CONFIG : {};
  const TG_CFG = CFG.TELEGRAM  || {};
  const HP_CFG = CFG.HONEYPOT  || {};

  function getTGToken() { return localStorage.getItem('hp_tg_token') || TG_CFG.BOT_TOKEN || ''; }
  function getTGChat()  { return localStorage.getItem('hp_tg_chat')  || TG_CFG.CHAT_ID   || ''; }
  function isTGEnabled(){ const t = getTGToken(); const c = getTGChat(); return TG_CFG.ENABLED === true || (t.length > 10 && c.length > 3); }

  const SHOW_TERMINAL = HP_CFG.SHOW_TERMINAL !== false;
  const URL_TRAP      = HP_CFG.URL_TRAP      !== false;
  const CONSOLE_TRAP  = HP_CFG.CONSOLE_TRAP  !== false;
  const MAX_ATTEMPTS  = HP_CFG.MAX_ATTEMPTS  || 5;
  const LOCKOUT_MIN   = HP_CFG.LOCKOUT_MIN   || 30;

  const SESSION_CONSOLE_KEY = 'hp_console_triggered';
  const SESSION_URL_KEY     = 'hp_url_triggered';

  // ── [A] POLA URL MENCURIGAKAN ──
  const SUSPICIOUS_PATTERNS = [
    /wp-admin/i, /wp-login/i, /xmlrpc/i, /phpmyadmin/i, /\.env/i, 
    /config\.php/i, /\/shell/i, /backdoor/i, /eval\s*\(/i, 
    /etc\/passwd/i, /\/\.git\//i, /union.*select/i, /\.\.\//
  ];

  function isSuspicious(url) {
    const decoded = (() => { try { return decodeURIComponent(String(url)); } catch { return String(url); } })();
    return SUSPICIOUS_PATTERNS.some(p => p.test(decoded));
  }

  // ── [B] STORAGE HELPERS ──
  const LS = {
    get   : (k, def = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
    set   : (k, v)        => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    remove: (...keys)     => { keys.forEach(k => { try { localStorage.removeItem(k); } catch {} }); },
  };
  const SS = {
    get: (k)    => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, String(v)); } catch {} },
  };

  // ── [C] ADVANCED HARDWARE FINGERPRINTING ──
  let _ipCache = null;
  let _geoCache = { lat: 0, lon: 0, city: 'Unknown', isp: 'Unknown' };

  function getHardwareFingerprint() {
    let gpu = 'Unknown GPU';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        gpu = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'WebGL Supported';
      }
    } catch (e) {}

    return {
      gpu: gpu,
      cores: navigator.hardwareConcurrency || 'Unknown',
      ram: navigator.deviceMemory ? `${navigator.deviceMemory}GB+` : 'Unknown',
      platform: navigator.platform || 'Unknown'
    };
  }

  async function getIntruderData(extras = {}) {
    if (!_ipCache) {
      try {
        const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
        const d = await r.json();
        _ipCache = d.ip || 'unknown';
        _geoCache = { lat: d.latitude, lon: d.longitude, city: d.city, isp: d.org };
      } catch { _ipCache = 'FETCH_FAILED'; }
    }

    const hw = getHardwareFingerprint();

    return {
      ip       : _ipCache,
      geo      : _geoCache,
      ua       : navigator.userAgent,
      hardware : `GPU: ${hw.gpu} | CPU: ${hw.cores} cores | RAM: ${hw.ram}`,
      screen   : `${screen.width}x${screen.height} (${screen.colorDepth}-bit)`,
      timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer : document.referrer || 'direct',
      time     : new Date().toISOString(),
      url      : location.href,
      ...extras,
    };
  }

  // ── [D] TELEGRAM ALERT FORMATTER ──
  async function sendTelegram(type, data) {
    const token = getTGToken();
    const chat  = getTGChat();
    if (!isTGEnabled() || !token || !chat) return;

    const emoji = { url_probe: '🕵️', login_fail: '🔑', lockout: '🔒', console_probe: '🖥️', dom_tamper: '🛡️', net_probe: '🕸️' }[type] || '⚠️';
    const mapsLink = data.geo && data.geo.lat ? `[Google Maps](https://www.google.com/maps/search/?api=1&query=${data.geo.lat},${data.geo.lon})` : 'N/A';

    const lines = [
      `${emoji} *0XRWISE IDS ALERT* [v3.0]`,
      `*Type:* \`${type.toUpperCase()}\``,
      `*IP:* \`${data.ip}\` (${data.geo?.city || '?'})`,
      `*ISP:* \`${data.geo?.isp || '?'}\``,
      `*Location:* ${mapsLink}`,
      `*Trigger:* \`${data.trigger || 'Unknown'}\``,
      data.attempts ? `*Attempts:* \`${data.attempts}\`` : '',
      ``,
      `*Hardware:* \`${data.hardware}\``,
      `*Screen:* \`${data.screen}\` | *TZ:* \`${data.timezone}\``,
      `*UA:* \`${(data.ua || '').substring(0, 100)}\``,
      `*Time:* \`${data.time}\``
    ].filter(Boolean).join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ chat_id: chat, text: lines, parse_mode: 'Markdown', disable_web_page_preview: true }),
      });
    } catch {}
  }

  // ── [E] FAKE TERMINAL OVERLAY ──
  function showHoneypotTerminal(triggerInfo) {
    if (!SHOW_TERMINAL) return;
    const overlay = document.getElementById('hp-terminal-overlay');
    const body    = document.getElementById('hp-terminal-body');
    if (!overlay || !body) return;

    overlay.classList.add('active');
    body.innerHTML = '';
    
    const script = [
      { cls: 'red',    txt: '╔════════════════════════════════════════════╗' },
      { cls: 'red',    txt: '║ SECURITY BREACH DETECTED - LOCKDOWN ACTIVE ║' },
      { cls: 'red',    txt: '╚════════════════════════════════════════════╝' },
      { cls: 'yellow', txt: `> VIOLATION : ${triggerInfo}` },
      { cls: 'white',  txt: `> IP LOGGED : ${_ipCache || 'Tracing...'}` },
      { cls: 'dim',    txt: '> Executing counter-measures...' },
      { cls: 'green',  txt: '> Telemetry sent to Operator. Have a nice day.' }
    ];

    let i = 0;
    function printNext() {
      if (i >= script.length) return;
      const span = document.createElement('span');
      span.className = `hp-line ${script[i].cls}`;
      span.textContent = script[i++].txt;
      body.appendChild(span);
      setTimeout(printNext, 80);
    }
    printNext();
  }

  async function triggerHoneypot(type, extras = {}) {
    const data = await getIntruderData(extras);
    LS.set('hp_logs', [...LS.get('hp_logs', []), { type, ...data }].slice(-50));
    await sendTelegram(type, data);
    showHoneypotTerminal(extras.trigger || type);
  }

  // ── [F] SHIELD: DOM TAMPERING DETECTION ──
  // Mendeteksi jika hacker menghapus terminal via element inspector
  window.addEventListener('DOMContentLoaded', () => {
    const overlayNode = document.getElementById('hp-terminal-overlay');
    if (!overlayNode) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.id === 'hp-terminal-overlay' || node.id === 'hp-terminal-box') {
            triggerHoneypot('dom_tamper', { trigger: 'Security overlay deleted from DOM' });
            // Put it back immediately!
            document.body.appendChild(overlayNode);
            overlayNode.style.display = 'flex';
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  // ── [G] NETWORK TRAP: FETCH INTERCEPTOR ──
  // Menjebak script otomatis yang mencoba fetch file .env via background
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (isSuspicious(url)) {
      triggerHoneypot('net_probe', { trigger: `Fetch attempt to: ${url}` });
      // Return fake response
      return new Response(JSON.stringify({ error: 'Nice try. Logged.' }), { status: 403 });
    }
    return originalFetch.apply(this, args);
  };

  // ── [H] EXISTING TRAPS (URL & CONSOLE) ──
  if (URL_TRAP) {
    function checkURL(url) {
      if (SS.get(SESSION_URL_KEY)) return;
      if (url && isSuspicious(String(url))) {
        SS.set(SESSION_URL_KEY, '1');
        triggerHoneypot('url_probe', { trigger: `Suspicious URL: ${String(url).substring(0, 100)}` });
      }
    }
    const _push = history.pushState.bind(history); const _replace = history.replaceState.bind(history);
    history.pushState = function(s,t,u) { checkURL(u); return _push(s,t,u); };
    history.replaceState = function(s,t,u) { checkURL(u); return _replace(s,t,u); };
    window.addEventListener('hashchange', () => checkURL(location.hash));
    if (isSuspicious(location.href)) checkURL(location.href);
  }

  if (CONSOLE_TRAP) {
    let devtoolsOpen = SS.get(SESSION_CONSOLE_KEY) === '1';
    const probe = /./;
    probe.toString = function () {
      if (!devtoolsOpen) {
        devtoolsOpen = true; SS.set(SESSION_CONSOLE_KEY, '1');
        triggerHoneypot('console_probe', { trigger: 'DevTools opened' });
      }
      return '[0xrwise]';
    };
    console.log('%c ', 'color:transparent', probe);
  }

  // ── [I] PUBLIC API (Untuk auth.js) ──
  window.Honeypot = {
    _sendLoginAlert: async function ({ meta }) {
      // Dipanggil dari main.js / auth.js
      await triggerHoneypot('login_fail', { 
        trigger: `Failed login for: ${meta.user || 'empty'}`, 
        attempts: `${meta.attempt} / ${MAX_ATTEMPTS}` 
      });
    },
    testAlert: () => triggerHoneypot('test', { trigger: 'Manual test from operator' })
  };

})();
