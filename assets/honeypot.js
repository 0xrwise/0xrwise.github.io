// ════════════════════════════════════════════════════════════════
//  0XRWISE HONEYPOT MODULE v2.3
//  File: assets/honeypot.js
//  Diload setelah config.js di index.html
//
//  Fitur:
//  [1] URL Probe Detector      — deteksi akses URL/hash mencurigakan
//  [2] Login Brute-Force Trap  — lockout + alert setelah N gagal
//  [3] DevTools Console Probe  — deteksi developer tools dibuka
//  [4] Telegram Alert          — kirim notifikasi real-time ke HP
//  [5] IP + Browser Fingerprint— kumpulkan data intruder (dengan UA-CH bypass OS spoofing)
//  [6] Fake Terminal Overlay   — psikologis deterrent
//  [7] localStorage Log        — log lokal, bisa dibaca owner
//
//  SECURITY FIX v2.3:
//  - Telegram credentials TIDAK lagi dibaca dari CONFIG (hardcoded).
//  - Token & Chat ID dibaca secara DINAMIS dari localStorage tiap kali
//    akan kirim alert. Key: 'hp_tg_token' dan 'hp_tg_chat'.
//  - Isi credentials via Admin Panel > Settings (tidak di-commit ke GitHub).
//
//  BUGFIX v2.3:
//  - mapLink di _sendLoginAlert diperbaiki ke URL Maps yang valid.
//  - getTGToken / getTGChat fungsi helper agar perubahan credentials
//    langsung efektif tanpa reload halaman.
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Ambil config dengan fallback aman ──────────────────────────
  const CFG    = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const TG_CFG = CFG.TELEGRAM  || {};
  const HP_CFG = CFG.HONEYPOT  || {};

  // ── SECURITY FIX: Baca token SECARA DINAMIS dari localStorage ──
  // Fungsi ini dipanggil SETIAP KALI akan kirim alert, bukan sekali
  // saat init. Ini memastikan credentials yang baru disimpan via
  // Admin Settings langsung aktif tanpa perlu reload halaman.
  function getTGToken() {
    try {
      return localStorage.getItem('hp_tg_token') || TG_CFG.BOT_TOKEN || '';
    } catch { return TG_CFG.BOT_TOKEN || ''; }
  }
  function getTGChat() {
    try {
      return localStorage.getItem('hp_tg_chat') || TG_CFG.CHAT_ID || '';
    } catch { return TG_CFG.CHAT_ID || ''; }
  }
  function isTGEnabled() {
    const token = getTGToken();
    const chat  = getTGChat();
    return TG_CFG.ENABLED === true || (token.length > 10 && chat.length > 3);
  }

  const SHOW_TERMINAL = HP_CFG.SHOW_TERMINAL !== false;
  const URL_TRAP      = HP_CFG.URL_TRAP      !== false;
  const CONSOLE_TRAP  = HP_CFG.CONSOLE_TRAP  !== false;
  const MAX_ATTEMPTS  = HP_CFG.MAX_ATTEMPTS  || 5;
  const LOCKOUT_MIN   = HP_CFG.LOCKOUT_MIN   || 30;

  const SESSION_CONSOLE_KEY = 'hp_console_triggered';
  const SESSION_URL_KEY     = 'hp_url_triggered';

  // ════════════════════════════════════════════════════════════════
  //  [A] POLA URL/HASH MENCURIGAKAN
  // ════════════════════════════════════════════════════════════════
  const SUSPICIOUS_PATTERNS = [
    /wp-admin/i, /wp-login/i, /xmlrpc/i,
    /administrator/i, /phpmyadmin/i, /pma\b/i,
    /\.env/i, /config\.php/i, /\.config/i,
    /\/shell/i, /backdoor/i, /\/cmd/i, /webshell/i,
    /eval\s*\(/i, /base64_decode/i,
    /passwd/i, /etc\/shadow/i, /etc\/passwd/i,
    /\/\.git\//i, /\/\.htaccess/i,
    /debug/i, /test\.php/i, /info\.php/i,
    /\/proc\//i, /\/etc\//i,
    /<script/i, /javascript:/i, /vbscript:/i,
    /union.*select/i, /sleep\s*\(/i, /benchmark\s*\(/i,
    /\.\.\//,
  ];

  function isSuspicious(url) {
    const decoded = (() => { try { return decodeURIComponent(String(url)); } catch { return String(url); } })();
    return SUSPICIOUS_PATTERNS.some(p => p.test(decoded));
  }

  // ════════════════════════════════════════════════════════════════
  //  [B] STORAGE HELPERS
  // ════════════════════════════════════════════════════════════════
  const LS = {
    get   : (k, def = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
    set   : (k, v)        => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    remove: (...keys)     => { keys.forEach(k => { try { localStorage.removeItem(k); } catch {} }); },
  };

  const SS = {
    get: (k)    => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, String(v)); } catch {} },
  };

  // ════════════════════════════════════════════════════════════════
  //  [C] KUMPULKAN DATA INTRUDER (dengan Client Hints API)
  // ════════════════════════════════════════════════════════════════
  let _ipCache = null;

  async function getIntruderData(extras = {}) {
    if (!_ipCache) {
      try {
        const r = await Promise.race([
          fetch('https://api.ipify.org?format=json').then(r => r.json()),
          new Promise((_, rej) => setTimeout(() => rej(), 2000)),
        ]);
        _ipCache = r.ip || 'unknown';
      } catch {
        _ipCache = 'unknown';
      }
    }

    let realOS = 'N/A';
    let deviceModel = 'N/A';

    if (navigator.userAgentData) {
      try {
        const uaData = await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'model']);
        realOS      = `${navigator.userAgentData.platform} ${uaData.platformVersion}`;
        deviceModel = uaData.model || 'Unknown';
      } catch {
        realOS = 'Blocked/Not Supported';
      }
    }

    return {
      ip       : _ipCache,
      ua       : navigator.userAgent,
      real_os  : realOS,
      model    : deviceModel,
      lang     : navigator.language,
      screen   : `${screen.width}x${screen.height}`,
      timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer : document.referrer || 'direct',
      time     : new Date().toISOString(),
      url      : location.href,
      ...extras,
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  [D] TELEGRAM ALERT
  // ════════════════════════════════════════════════════════════════
  async function sendTelegram(type, data) {
    // SECURITY FIX: Baca token fresh setiap kali kirim
    const token = getTGToken();
    const chat  = getTGChat();

    if (!isTGEnabled() || !token || !chat) {
      console.warn('[HP] Telegram tidak terkirim: token/chat_id kosong atau belum diatur di Admin > Settings.');
      return;
    }

    const emoji = {
      url_probe    : '🕵️',
      login_fail   : '🔑',
      lockout      : '🔒',
      console_probe: '🖥️',
      page_load    : '👁️',
    }[type] || '⚠️';

    const lines = [
      `${emoji} *0XRWISE HONEYPOT ALERT*`,
      `*Type:* \`${type.toUpperCase()}\``,
      `*IP:* \`${data.ip}\``,
      `*Time:* \`${data.time}\``,
      `*URL:* \`${data.url}\``,
      data.trigger  ? `*Trigger:* \`${data.trigger}\``   : null,
      data.attempts ? `*Attempts:* \`${data.attempts}\`` : null,
      `*OS Asli:* \`${data.real_os}\` | *Device:* \`${data.model}\``,
      `*UA:* \`${(data.ua || '').substring(0, 80)}\``,
      `*Screen:* \`${data.screen}\` | *TZ:* \`${data.timezone}\``,
      `*Lang:* \`${data.lang}\` | *Ref:* \`${data.referrer}\``,
    ].filter(Boolean).join('\n');

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          chat_id   : chat,
          text      : lines,
          parse_mode: 'Markdown',
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn('[HP] Telegram error:', errBody.description || res.status);
      }
    } catch {
      // Senyap agar honeypot tidak terekspos
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  [E] LOG LOKAL
  // ════════════════════════════════════════════════════════════════
  function logLocally(type, data) {
    const logs = LS.get('hp_logs', []);
    logs.push({ type, ...data });
    if (logs.length > 50) logs.splice(0, logs.length - 50);
    LS.set('hp_logs', logs);
  }

  // ════════════════════════════════════════════════════════════════
  //  [F] FAKE TERMINAL OVERLAY (deterrent)
  // ════════════════════════════════════════════════════════════════
  function showHoneypotTerminal(triggerInfo) {
    if (!SHOW_TERMINAL) return;
    const overlay = document.getElementById('hp-terminal-overlay');
    const body    = document.getElementById('hp-terminal-body');
    if (!overlay || !body) return;

    const ip  = _ipCache || '...';
    const now = new Date().toISOString();

    const script = [
      { cls: 'dim',    txt: '──────────────────────────────────────' },
      { cls: 'red',    txt: '  [!] HONEYPOT SYSTEM ACTIVATED [!]' },
      { cls: 'red',    txt: '  0XRWISE // INTRUSION DETECTION v2.3' },
      { cls: 'dim',    txt: '──────────────────────────────────────' },
      { cls: '',       txt: '' },
      { cls: 'yellow', txt: '[!] INTRUSION DETECTION SYSTEM ACTIVATED' },
      { cls: '',       txt: '' },
      { cls: 'white',  txt: `> Timestamp  : ${now}` },
      { cls: 'white',  txt: `> Client IP  : ${ip}` },
      { cls: 'white',  txt: `> Trigger    : ${triggerInfo}` },
      { cls: 'white',  txt: `> Session ID : ${Math.random().toString(36).slice(2, 10).toUpperCase()}` },
      { cls: '',       txt: '' },
      { cls: 'red',    txt: '> Initiating trace protocol...' },
      { cls: 'yellow', txt: '> Logging connection metadata......... [DONE]' },
      { cls: 'yellow', txt: '> Fingerprinting browser profile....... [DONE]' },
      { cls: 'green',  txt: '> Incident report transmitted........... [SENT]' },
      { cls: '',       txt: '' },
      { cls: 'dim',    txt: '> This system is monitored. All access attempts are recorded.' },
      { cls: '',       txt: '' },
    ];

    body.innerHTML = '';
    overlay.classList.add('active');

    let i = 0;
    function printNext() {
      if (i >= script.length) return;
      const s    = script[i++];
      const span = document.createElement('span');
      span.className = `hp-line ${s.cls}`;
      span.textContent = s.txt;
      body.appendChild(span);
      body.scrollTop = body.scrollHeight;
      setTimeout(printNext, 60 + Math.random() * 80);
    }
    printNext();
  }

  // ════════════════════════════════════════════════════════════════
  //  [G] TRIGGER UTAMA
  // ════════════════════════════════════════════════════════════════
  async function triggerHoneypot(type, extras = {}) {
    const data = await getIntruderData(extras);
    logLocally(type, data);
    await sendTelegram(type, data);
    if (['url_probe', 'console_probe'].includes(type)) {
      showHoneypotTerminal(extras.trigger || type);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  [1] URL PROBE DETECTOR
  // ════════════════════════════════════════════════════════════════
  if (URL_TRAP) {
    function checkURL(url) {
      if (SS.get(SESSION_URL_KEY)) return;
      if (url && isSuspicious(String(url))) {
        SS.set(SESSION_URL_KEY, '1');
        triggerHoneypot('url_probe', { trigger: String(url).substring(0, 200) });
      }
    }

    const _push    = history.pushState.bind(history);
    const _replace = history.replaceState.bind(history);

    history.pushState = function (s, t, url) {
      checkURL(url); return _push(s, t, url);
    };
    history.replaceState = function (s, t, url) {
      checkURL(url); return _replace(s, t, url);
    };

    window.addEventListener('hashchange', () => checkURL(location.hash));

    if (isSuspicious(location.href)) checkURL(location.href);
  }

  // ════════════════════════════════════════════════════════════════
  //  [2] CONSOLE / DEVTOOLS PROBE DETECTOR
  // ════════════════════════════════════════════════════════════════
  if (CONSOLE_TRAP) {
    let devtoolsOpen = SS.get(SESSION_CONSOLE_KEY) === '1';

    const probe = /./;
    probe.toString = function () {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        SS.set(SESSION_CONSOLE_KEY, '1');
        triggerHoneypot('console_probe', { trigger: 'DevTools opened' });
      }
      return '[0xrwise]';
    };

    const _timingInterval = setInterval(() => {
      if (devtoolsOpen) { clearInterval(_timingInterval); return; }
      const t0 = performance.now();
      console.debug('%c ', 'color:transparent', probe);
      if (performance.now() - t0 > 160) {
        devtoolsOpen = true;
        SS.set(SESSION_CONSOLE_KEY, '1');
        clearInterval(_timingInterval);
        triggerHoneypot('console_probe', { trigger: 'DevTools timing probe' });
      }
    }, 2000);
  }

  // ════════════════════════════════════════════════════════════════
  //  [3] LOGIN BRUTE-FORCE TRAP
  // ════════════════════════════════════════════════════════════════
  const LOGIN = {
    recordLoginFail: async function () {
      const attempts = (LS.get('hp_attempts', 0) || 0) + 1;
      LS.set('hp_attempts', attempts);

      await triggerHoneypot('login_fail', {
        trigger : 'Wrong password',
        attempts: `${attempts} / ${MAX_ATTEMPTS}`,
      });

      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_MIN * 60 * 1000;
        LS.set('hp_lockout', lockUntil);
        await triggerHoneypot('lockout', {
          trigger : `Locked out after ${attempts} attempts`,
          attempts: attempts,
        });
      }
    },

    resetLoginAttempts: function () {
      LS.remove('hp_attempts', 'hp_lockout');
    },

    isLockedOut: function () {
      const lockUntil = LS.get('hp_lockout', 0);
      if (!lockUntil) return false;
      if (Date.now() < lockUntil) {
        return Math.ceil((lockUntil - Date.now()) / 60000);
      }
      LS.remove('hp_lockout', 'hp_attempts');
      return false;
    },
  };

  // ════════════════════════════════════════════════════════════════
  //  [4] PUBLIC API
  // ════════════════════════════════════════════════════════════════
  window.Honeypot = {
    ...LOGIN,

    _sendLoginAlert: async function ({ ipData, devData, meta }) {
      // SECURITY FIX: Baca token fresh, bukan dari closure init
      const token = getTGToken();
      const chat  = getTGChat();
      if (!isTGEnabled() || !token || !chat) return;

      const battStr = devData.battery
        ? `${devData.battery.level}% ${devData.battery.charging ? '[⚡]' : '[bat]'}`
        : 'N/A';

      // BUGFIX: Gunakan URL Maps yang valid (bukan proxy googleusercontent)
      const mapsUrl = `https://maps.google.com/?q=${ipData.lat},${ipData.lon}`;

      const lines = [
        `🔑 *0XRWISE — LOGIN FAIL ALERT*`,
        `*Attempt:* \`${meta.attempt} / ${MAX_ATTEMPTS}\``,
        `*User tried:* \`${meta.user || '(empty)'}\`  |  *Passlen:* \`${meta.passLen} chars\``,
        `*PAT hint:* \`${meta.patHint || 'none'}\``,
        ``,
        `*IP:* \`${ipData.ip}\`  |  *ISP:* \`${ipData.isp}\``,
        `*Location:* \`${ipData.city}, ${ipData.region}, ${ipData.country}\``,
        `*Maps:* ${mapsUrl}`,
        ``,
        `*Device:* \`${devData.deviceType} | ${devData.os} | ${devData.browser}\``,
        `*Screen:* \`${devData.screen_res}\` | *Battery:* \`${battStr}\``,
        `*TZ:* \`${devData.timezone}\`  |  *Lang:* \`${devData.lang}\``,
        `*Canvas FP:* \`0x${devData.canvasHash}\``,
        `*Time:* \`${meta.timestamp}\``,
      ].join('\n');

      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ chat_id: chat, text: lines, parse_mode: 'Markdown' }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.warn('[HP] Login alert Telegram error:', errBody.description || res.status);
        }
      } catch {}
    },

    showLogs: function () {
      const logs = LS.get('hp_logs', []);
      if (!logs.length) { console.log('%c[HP] No logs.', 'color:#00ff41'); return []; }
      console.group('%c[0XRWISE] HONEYPOT LOGS', 'color:#00ff41; font-weight:bold');
      logs.forEach((l, i) => console.log(`#${i + 1}`, l));
      console.groupEnd();
      return logs;
    },

    clearLogs: function () {
      LS.remove('hp_logs', 'hp_attempts', 'hp_lockout');
      console.log('%c[HP] Logs cleared.', 'color:#00ff41');
    },

    testAlert: function () {
      triggerHoneypot('url_probe', { trigger: '[TEST] Manual trigger by owner' });
      console.log('%c[HP] Test alert sent.', 'color:#00ff41');
    },

    // Debug helper — cek status Telegram (baca dari localStorage)
    checkTelegram: function () {
      const token = getTGToken();
      const chat  = getTGChat();
      console.log('%c[HP] Telegram Status:', 'color:#00ff41; font-weight:bold');
      console.log('  ENABLED :', isTGEnabled());
      console.log('  TOKEN   :', token ? token.substring(0, 10) + '...' : '(kosong — isi via Admin > Settings)');
      console.log('  CHAT_ID :', chat || '(kosong — isi via Admin > Settings)');
      console.log('  SOURCE  :', localStorage.getItem('hp_tg_token') ? 'localStorage' : 'config.js');
    },
  };

  window.showHoneypotLogs  = window.Honeypot.showLogs;
  window.clearHoneypotLogs = window.Honeypot.clearLogs;

})();
