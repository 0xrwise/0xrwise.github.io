// ════════════════════════════════════════════════════════════════
//  0XRWISE HONEYPOT MODULE v2.2 (Updated UA-CH)
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
//  BUGFIX v2.2:
//  - Added User-Agent Client Hints API untuk menangkap OS dan Device Model asli (Bypass Android 10 limit)
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Ambil config dengan fallback aman ──────────────────────────
  const CFG    = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const TG     = CFG.TELEGRAM  || {};
  const HP_CFG = CFG.HONEYPOT  || {};

  const TG_TOKEN = TG.BOT_TOKEN || '';
  const TG_CHAT  = TG.CHAT_ID   || '';

  // BUG FIX #1: Jika ENABLED=false tapi token & chat_id sudah terisi, anggap enabled otomatis
  // Ini mencegah bug di mana user lupa ganti ENABLED ke true
  const TG_ENABLED = TG.ENABLED === true || (TG_TOKEN.length > 10 && TG_CHAT.length > 3);

  const SHOW_TERMINAL = HP_CFG.SHOW_TERMINAL !== false;   // default: true
  const URL_TRAP      = HP_CFG.URL_TRAP      !== false;
  const CONSOLE_TRAP  = HP_CFG.CONSOLE_TRAP  !== false;
  const MAX_ATTEMPTS  = HP_CFG.MAX_ATTEMPTS  || 5;
  const LOCKOUT_MIN   = HP_CFG.LOCKOUT_MIN   || 30;

  // BUG FIX #6: Session key untuk mencegah notifikasi muncul berulang saat refresh
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

  // Menggunakan sessionStorage untuk cek per sesi (reset saat tab/browser ditutup)
  const SS = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, String(v)); } catch {} },
  };

  // ════════════════════════════════════════════════════════════════
  //  [C] KUMPULKAN DATA INTRUDER (dengan Client Hints API)
  // ════════════════════════════════════════════════════════════════
  let _ipCache = null;

  async function getIntruderData(extras = {}) {
    // 1. Ambil IP Address
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

    // 2. Tarik Data OS & Model Asli (Bypass User-Agent Spoofing)
    let realOS = "N/A";
    let deviceModel = "N/A";
    
    if (navigator.userAgentData) {
      try {
        const uaData = await navigator.userAgentData.getHighEntropyValues(["platformVersion", "model"]);
        realOS = `${navigator.userAgentData.platform} ${uaData.platformVersion}`;
        deviceModel = uaData.model || "Unknown";
      } catch (e) {
        realOS = "Blocked/Not Supported";
      }
    }

    // 3. Return Payload
    return {
      ip        : _ipCache,
      ua        : navigator.userAgent,
      real_os   : realOS,       
      model     : deviceModel,  
      lang      : navigator.language,
      screen    : `${screen.width}x${screen.height}`,
      timezone  : Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer  : document.referrer || 'direct',
      time      : new Date().toISOString(),
      url       : location.href,
      ...extras,
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  [D] TELEGRAM ALERT
  // ════════════════════════════════════════════════════════════════
  async function sendTelegram(type, data) {
    // BUG FIX #1: Cek ulang token & chat sebelum kirim
    if (!TG_ENABLED || !TG_TOKEN || !TG_CHAT) {
      console.warn('[HP] Telegram tidak terkirim: token/chat_id kosong atau ENABLED=false');
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
      const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          chat_id   : TG_CHAT,
          text      : lines,
          parse_mode: 'Markdown',
        }),
      });
      // BUG FIX #1: Log error response untuk debugging
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn('[HP] Telegram error:', errBody.description || res.status);
      }
    } catch (e) {
      // Diam saja agar honeypot tidak terekspos ke peretas
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

    const ip   = _ipCache || '...';
    const now  = new Date().toISOString();

    // BUG FIX #2: ASCII diganti dengan teks yang mobile-friendly (tidak menggunakan box drawing lebar)
    const script = [
      { cls: 'dim',    txt: '──────────────────────────────────────' },
      { cls: 'red',    txt: '  [!] HONEYPOT SYSTEM ACTIVATED [!]' },
      { cls: 'red',    txt: '  0XRWISE // INTRUSION DETECTION v2.4' },
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
  //  [G] TRIGGER UTAMA — dipanggil setiap ada kejadian mencurigakan
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
      // BUG FIX #6: Cek apakah URL probe sudah pernah di-trigger sesi ini
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
  //  BUG FIX #6: Hanya trigger 1x per sesi menggunakan sessionStorage
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

    // BUG FIX: Simpan interval ID agar bisa di-clear, dan stop polling setelah terdeteksi
    const _timingInterval = setInterval(() => {
      if (devtoolsOpen) { clearInterval(_timingInterval); return; }
      const t0 = performance.now();
      // BUG FIX: Gunakan console.debug agar tidak muncul di console normal user
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
        const remaining = Math.ceil((lockUntil - Date.now()) / 60000);
        return remaining;
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
      if (!TG_ENABLED || !TG_TOKEN || !TG_CHAT) return;
      const battStr = devData.battery ? `${devData.battery.level}% ${devData.battery.charging ? '[⚡]' : '[bat]'}` : 'N/A';
      const lines = [
        `🔑 *0XRWISE — LOGIN FAIL ALERT*`,
        `*Attempt:* \`${meta.attempt} / ${MAX_ATTEMPTS}\``,
        `*User tried:* \`${meta.user || '(empty)'}\`  |  *Passlen:* \`${meta.passLen} chars\``,
        `*PAT hint:* \`${meta.patHint || 'none'}\``,
        ``,
        `*IP:* \`${ipData.ip}\`  |  *ISP:* \`${ipData.isp}\``,
        `*Location:* \`${ipData.city}, ${ipData.region}, ${ipData.country}\``,
        `*Maps:* https://maps.google.com/?q=${ipData.lat},${ipData.lon}`,
        ``,
        `*Device:* \`${devData.deviceType} | ${devData.os} | ${devData.browser}\``,
        `*Screen:* \`${devData.screen_res}\` | *Battery:* \`${battStr}\``,
        `*TZ:* \`${devData.timezone}\`  |  *Lang:* \`${devData.lang}\``,
        `*Canvas FP:* \`0x${devData.canvasHash}\``,
        `*Time:* \`${meta.timestamp}\``,
      ].join('\n');
      try {
        const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TG_CHAT, text: lines, parse_mode: 'Markdown' }),
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

    // Debug helper — cek status Telegram
    checkTelegram: function () {
      console.log('%c[HP] Telegram Status:', 'color:#00ff41; font-weight:bold');
      console.log('  ENABLED:', TG_ENABLED);
      console.log('  TOKEN:', TG_TOKEN ? TG_TOKEN.substring(0, 10) + '...' : '(kosong)');
      console.log('  CHAT_ID:', TG_CHAT || '(kosong)');
    },
  };

  window.showHoneypotLogs  = window.Honeypot.showLogs;
  window.clearHoneypotLogs = window.Honeypot.clearLogs;

})();
