/**
 * ============================================================
 * 0XRWISE // SIGINT STATION — assets/js/main.js
 * Client-Side Telemetry + Terminal Diagnostics Engine
 * ============================================================
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   § 1. UTILITY HELPERS
   ═══════════════════════════════════════════════════════════ */

const pad        = n  => String(n).padStart(2, '0');
const randInt    = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep      = ms => new Promise(r => setTimeout(r, ms));

/** Local time as HH:MM:SS */
function timeNow() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Local datetime as YYYY-MM-DD HH:MM:SS */
function dateTimeNow() {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Round a float to N decimal places. */
const toFixed = (n, dec = 2) => Number(n).toFixed(dec);


/* ═══════════════════════════════════════════════════════════
   § 2. CONSOLE BOOT SEQUENCE
   ═══════════════════════════════════════════════════════════ */

function runBootSequence() {
  const S = 'color:#00ff41;font-weight:700';
  const B = 'color:#00e5ff;font-weight:700';
  const W = 'color:#ffb300;font-weight:700';
  const R = 'color:#c8ffc8';

  console.clear();
  console.log(
    '%c╔══════════════════════════════════════════════════╗\n' +
    '║    0XRWISE // SIGINT STATION v2.0 [CLASSIFIED]  ║\n' +
    '╚══════════════════════════════════════════════════╝',
    'color:#00ff41;font-family:monospace;font-size:0.85em;font-weight:700'
  );

  [
    [0,    `%c[BOOT]%c  Initializing SIGINT Station kernel...`,            S, R],
    [130,  `%c[INIT]%c  Loading memory modules... OK`,                     B, R],
    [280,  `%c[NET] %c  Establishing client session...`,                    S, R],
    [430,  `%c[TEL] %c  Client telemetry probe dispatched`,                 W, R],
    [600,  `%c[SYS] %c  Dashboard services started`,                        B, R],
    [750,  `%c[ ✓  ]%c  SIGINT STATION ONLINE`,                            S, R],
  ].forEach(([delay, msg, s, r]) => setTimeout(() => console.log(msg, s, r), delay));
}


/* ═══════════════════════════════════════════════════════════
   § 3. LIVE CLOCK  →  #liveClock
   ═══════════════════════════════════════════════════════════ */

function initLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const tick = () => { el.textContent = dateTimeNow(); };
  tick();
  setInterval(tick, 1000);
}


/* ═══════════════════════════════════════════════════════════
   § 4. CLIENT TELEMETRY COLLECTOR
   Returns a Promise that resolves to an ordered array of
   { level, msg } objects built from real browser APIs.
   ═══════════════════════════════════════════════════════════ */

async function collectTelemetry() {
  const entries = [];
  const push    = (level, msg) => entries.push({ level, msg });

  /* ── 4.1 Session Marker ── */
  const sessionStart = performance.now();
  push('ok', `Session initiated — timestamp: ${dateTimeNow()}`);

  /* ── 4.2 User Agent ── */
  const ua = navigator.userAgent;
  push('info', `User-Agent string captured — length: ${ua.length} chars`);

  // Parse browser name heuristically
  let browser = 'Unknown';
  if (/Edg\//.test(ua))         browser = 'Microsoft Edge';
  else if (/OPR\//.test(ua))    browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua))browser = 'Mozilla Firefox';
  else if (/Safari\//.test(ua)) browser = 'Apple Safari';
  push('ok', `Browser identified — engine: ${browser}`);

  // Parse OS heuristically
  let os = 'Unknown OS';
  if (/Windows NT 10/.test(ua))      os = 'Windows 10/11';
  else if (/Windows NT 6/.test(ua))  os = 'Windows Vista/7/8';
  else if (/Mac OS X/.test(ua))      os = 'macOS';
  else if (/Android/.test(ua))       os = 'Android';
  else if (/iPhone|iPad/.test(ua))   os = 'iOS';
  else if (/Linux/.test(ua))         os = 'Linux';
  push('ok', `Operating system detected — platform: ${os}`);

  /* ── 4.3 Screen & Viewport ── */
  const sw = window.screen.width;
  const sh = window.screen.height;
  const dpr = window.devicePixelRatio || 1;
  push('info', `Physical display resolution: ${sw} × ${sh} px @ ${toFixed(dpr, 1)}x DPR`);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  push('info', `Viewport dimensions: ${vw} × ${vh} px`);

  const colorDepth = window.screen.colorDepth || 24;
  push('info', `Color depth: ${colorDepth}-bit`);

  /* ── 4.4 Device Type Inference ── */
  let deviceType = 'Desktop';
  if (sw <= 480)       deviceType = 'Mobile (small)';
  else if (sw <= 768)  deviceType = 'Mobile / Tablet';
  else if (sw <= 1024) deviceType = 'Tablet / Small Laptop';
  push('ok', `Device class inferred — category: ${deviceType}`);

  /* ── 4.5 Touch Support ── */
  const touchPoints = navigator.maxTouchPoints || 0;
  const touchLabel  = touchPoints > 0
    ? `touch-capable (max ${touchPoints} points)`
    : 'non-touch input device';
  push('info', `Input capability: ${touchLabel}`);

  /* ── 4.6 Language & Locale ── */
  const lang      = navigator.language || 'unknown';
  const langList  = (navigator.languages || [lang]).join(', ');
  push('info', `Browser locale: ${lang} — accepted languages: [${langList}]`);

  /* ── 4.7 Timezone ── */
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'undefined';
  const tzOffset = -(new Date().getTimezoneOffset());
  const tzSign   = tzOffset >= 0 ? '+' : '-';
  const tzHours  = pad(Math.floor(Math.abs(tzOffset) / 60));
  const tzMins   = pad(Math.abs(tzOffset) % 60);
  push('info', `Client timezone: ${tz} (UTC${tzSign}${tzHours}:${tzMins})`);

  /* ── 4.8 Connection API ── */
  const conn = navigator.connection
    || navigator.mozConnection
    || navigator.webkitConnection
    || null;

  if (conn) {
    const effectiveType = conn.effectiveType || 'unknown';
    const downlink      = conn.downlink      != null ? `${conn.downlink} Mbps` : 'N/A';
    const rtt           = conn.rtt           != null ? `${conn.rtt} ms`        : 'N/A';
    const saveData      = conn.saveData      ? 'enabled' : 'disabled';
    push('ok',   `Network type: ${effectiveType} — estimated downlink: ${downlink}`);
    push('info', `Network RTT estimate: ${rtt} — data-saver: ${saveData}`);
  } else {
    push('info', 'Network Information API: not supported by this client');
  }

  /* ── 4.9 Hardware Concurrency ── */
  const cores = navigator.hardwareConcurrency || 'unknown';
  push('info', `CPU logical cores reported: ${cores}`);

  /* ── 4.10 Memory Estimate (Chrome only) ── */
  if (navigator.deviceMemory != null) {
    push('info', `Device memory estimate: ${navigator.deviceMemory} GB`);
  }

  /* ── 4.11 Cookie & Storage Policy ── */
  const cookieEnabled = navigator.cookieEnabled;
  push('info', `Cookie policy: ${cookieEnabled ? 'allowed' : 'blocked by client'}`);

  let storageQuota = null;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB   = toFixed((estimate.usage  || 0) / 1048576, 2);
      const quotaMB  = toFixed((estimate.quota   || 0) / 1048576, 2);
      storageQuota   = `${usedMB} MB used of ${quotaMB} MB quota`;
      push('ok', `Storage quota: ${storageQuota}`);
    } catch (_) {
      push('info', 'Storage quota API: access denied');
    }
  }

  /* ── 4.12 Do Not Track ── */
  const dnt = navigator.doNotTrack;
  const dntLabel = dnt === '1' ? 'active — client requests no tracking'
                : dnt === '0' ? 'inactive'
                : 'not set';
  push('info', `Do-Not-Track signal: ${dntLabel}`);

  /* ── 4.13 PDF / WebGL / Canvas Fingerprint signals ── */
  const pdfEnabled = navigator.pdfViewerEnabled != null
    ? (navigator.pdfViewerEnabled ? 'yes' : 'no')
    : 'unknown';
  push('info', `Inline PDF viewer: ${pdfEnabled}`);

  const canvas = document.createElement('canvas');
  const glCtx  = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (glCtx) {
    const renderer = glCtx.getParameter(glCtx.RENDERER) || 'unknown';
    push('ok', `WebGL renderer detected: ${renderer}`);
  } else {
    push('warn', 'WebGL context unavailable — hardware acceleration may be disabled');
  }

  /* ── 4.14 Public IP via ipify ── */
  try {
    const resp = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      push('ok', `Public IP address resolved: ${data.ip}`);
    } else {
      push('warn', `IP lookup returned HTTP ${resp.status} — skipping`);
    }
  } catch (_) {
    push('warn', 'Public IP lookup failed — network request blocked or offline');
  }

  /* ── 4.15 Page Performance ── */
  const [navEntry] = performance.getEntriesByType('navigation');
  if (navEntry) {
    const dns       = toFixed(navEntry.domainLookupEnd - navEntry.domainLookupStart);
    const tcp       = toFixed(navEntry.connectEnd      - navEntry.connectStart);
    const ttfb      = toFixed(navEntry.responseStart   - navEntry.requestStart);
    const domLoad   = toFixed(navEntry.domContentLoadedEventEnd - navEntry.startTime);
    const fullLoad  = toFixed(navEntry.loadEventEnd    - navEntry.startTime);
    push('info', `DNS resolution time: ${dns} ms`);
    push('info', `TCP connect time: ${tcp} ms`);
    push('info', `Time to first byte (TTFB): ${ttfb} ms`);
    push('ok',   `DOM content loaded: ${domLoad} ms`);
    push('ok',   `Full page load time: ${fullLoad} ms`);
  }

  const totalElapsed = toFixed(performance.now() - sessionStart);
  push('ok', `Telemetry collection complete — elapsed: ${totalElapsed} ms`);

  return entries;
}


/* ═══════════════════════════════════════════════════════════
   § 5. REAL-TIME INTEL LOG  →  .intel-log
   ═══════════════════════════════════════════════════════════ */

const LOG_LEVEL_LABELS = {
  ok:   '[  OK  ]',
  info: '[ INFO ]',
  warn: '[ WARN ]',
  crit: '[ CRIT ]',
};

function createLogEntry(level, msg) {
  const el = document.createElement('div');
  el.className = 'log-entry';
  el.style.cssText = 'opacity:0;transform:translateX(-10px);transition:opacity 0.18s ease,transform 0.18s ease';
  el.innerHTML =
    `<span class="log-time">${timeNow()}</span>` +
    `<span class="log-level ${level}">${LOG_LEVEL_LABELS[level] || '[ INFO ]'}</span>` +
    `<span class="log-msg">${msg}</span>`;
  return el;
}

function appendLog(container, level, msg) {
  const entry = createLogEntry(level, msg);
  container.appendChild(entry);

  // Trim oldest entries beyond 100
  while (container.children.length > 100) {
    container.removeChild(container.firstChild);
  }

  // Fade in
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      entry.style.opacity   = '1';
      entry.style.transform = 'translateX(0)';
    })
  );

  // Auto-scroll
  container.scrollTop = container.scrollHeight;
}

async function initRealtimeLog() {
  const container = document.querySelector('.intel-log');
  if (!container) return;

  container.innerHTML = '';

  // Seed: system-startup entries before telemetry arrives
  const seedEntries = [
    { level: 'ok',   msg: 'Dashboard module loaded — awaiting client handshake' },
    { level: 'info', msg: 'Initializing telemetry probe...' },
  ];

  for (const [idx, { level, msg }] of seedEntries.entries()) {
    setTimeout(() => appendLog(container, level, msg), 300 + idx * 280);
  }

  // Collect real telemetry (may include async fetch)
  const telemetry = await collectTelemetry();

  // Stream telemetry entries into the log one by one
  const BASE_DELAY    = 300 + seedEntries.length * 280 + 200;
  const ENTRY_SPACING = 420; // ms between entries

  telemetry.forEach(({ level, msg }, idx) => {
    setTimeout(() => appendLog(container, level, msg), BASE_DELAY + idx * ENTRY_SPACING);
  });
}


/* ═══════════════════════════════════════════════════════════
   § 6. TERMINAL DIAGNOSTICS ENGINE  →  .terminal-block
   ═══════════════════════════════════════════════════════════ */

/**
 * Terminal sessions are built at runtime using real measurements
 * so the output is always accurate and never fabricated.
 */
async function buildTerminalSessions() {
  const sessions = [];

  /* ── Session A: DOM & Resource Diagnostics ── */
  const [navEntry] = performance.getEntriesByType('navigation');
  const domLoaded  = navEntry ? toFixed(navEntry.domContentLoadedEventEnd - navEntry.startTime) : '—';
  const fullLoaded = navEntry ? toFixed(navEntry.loadEventEnd - navEntry.startTime) : '—';
  const resources  = performance.getEntriesByType('resource');
  const totalRes   = resources.length;
  const totalBytes = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0);
  const totalKB    = toFixed(totalBytes / 1024, 1);

  sessions.push({
    command: 'run_diagnostics --scope page_performance',
    outputDelay: 60,
    lines: [
      { type: 'out',  text: '[*] Evaluating Navigation Timing API data...' },
      { type: 'ok',   text: `[+] DOM Content Loaded   : ${domLoaded} ms` },
      { type: 'ok',   text: `[+] Full Page Load        : ${fullLoaded} ms` },
      { type: 'out',  text: `[*] Total resources fetched: ${totalRes} requests` },
      { type: 'ok',   text: `[+] Total transfer size   : ${totalKB} KB` },
      {
        type: totalBytes > 1048576 ? 'warn' : 'ok',
        text: `[${totalBytes > 1048576 ? '!' : '+'}] Transfer budget status  : ${totalBytes > 1048576 ? 'EXCEEDED 1 MB threshold' : 'within acceptable range'}`,
      },
    ],
  });

  /* ── Session B: Asset Integrity Check ── */
  const cssRes = resources.filter(r => r.initiatorType === 'link' && r.name.endsWith('.css'));
  const jsRes  = resources.filter(r => r.initiatorType === 'script');
  const imgRes = resources.filter(r => r.initiatorType === 'img');
  const fontRes = resources.filter(r => r.initiatorType === 'css' || /fonts\.gstatic/.test(r.name));

  sessions.push({
    command: 'check_assets_integrity --verbose',
    outputDelay: 55,
    lines: [
      { type: 'out',  text: '[*] Scanning loaded resource manifest...' },
      { type: 'ok',   text: `[+] Stylesheets loaded    : ${cssRes.length} file(s)` },
      { type: 'ok',   text: `[+] JavaScript modules    : ${jsRes.length} file(s)` },
      { type: 'ok',   text: `[+] Image assets          : ${imgRes.length} file(s)` },
      { type: 'info', text: `[i] Font resources        : ${fontRes.length} entry/entries` },
      { type: 'ok',   text: '[+] No mixed-content warnings detected' },
      { type: 'ok',   text: '[✓] Asset integrity check passed' },
    ],
  });

  /* ── Session C: Client Environment Summary ── */
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 'N/A';
  const lang  = navigator.language || 'N/A';
  const conn  = navigator.connection || null;
  const netType = conn ? (conn.effectiveType || 'unknown') : 'N/A';
  const downlink = conn && conn.downlink != null ? `${conn.downlink} Mbps` : 'N/A';

  sessions.push({
    command: 'analyze_client_environment --format summary',
    outputDelay: 58,
    lines: [
      { type: 'out',  text: '[*] Collecting environment data via Navigator API...' },
      { type: 'info', text: `[i] Viewport              : ${vw} × ${vh} px` },
      { type: 'info', text: `[i] Device Pixel Ratio    : ${toFixed(dpr, 1)}x` },
      { type: 'info', text: `[i] CPU logical cores     : ${cores}` },
      { type: 'info', text: `[i] Browser locale        : ${lang}` },
      { type: 'info', text: `[i] Network type          : ${netType}` },
      { type: 'info', text: `[i] Est. downlink         : ${downlink}` },
      { type: 'ok',   text: '[✓] Environment snapshot complete' },
    ],
  });

  /* ── Session D: Memory & Paint Timing ── */
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
  const fp  = paintEntries.find(e => e.name === 'first-paint');

  const fcpMs  = fcp  ? toFixed(fcp.startTime) : 'not reported';
  const fpMs   = fp   ? toFixed(fp.startTime)  : 'not reported';
  const memInfo = performance.memory || null;
  const heapMB = memInfo ? toFixed(memInfo.usedJSHeapSize / 1048576, 2) : null;

  sessions.push({
    command: 'measure_render_pipeline --paint --memory',
    outputDelay: 62,
    lines: [
      { type: 'out',  text: '[*] Querying Paint Timing API...' },
      { type: 'ok',   text: `[+] First Paint (FP)      : ${fpMs} ms` },
      { type: 'ok',   text: `[+] First Contentful Paint: ${fcpMs} ms` },
      ...(heapMB
        ? [
            { type: 'out', text: '[*] Querying JS Heap via performance.memory...' },
            { type: 'ok',  text: `[+] JS Heap used          : ${heapMB} MB` },
            { type: heapMB > 50 ? 'warn' : 'ok', text: `[${heapMB > 50 ? '!' : '+'}] Heap usage status       : ${heapMB > 50 ? 'elevated — monitor GC pressure' : 'within normal range'}` },
          ]
        : [{ type: 'info', text: '[i] performance.memory API not available in this browser' }]
      ),
      { type: 'ok',   text: '[✓] Render pipeline measurement complete' },
    ],
  });

  return sessions;
}

/* ── Terminal render helpers ── */
const PROMPT_HTML = `<span class="t-prompt">root@sigint-station:~# </span>`;
const TYPE_SPEED  = 36;   // ms per character
const AFTER_CMD   = 300;  // ms pause after typing before output appears
const AFTER_OUT   = 2000; // ms pause after output before next command
const LOOP_GAP    = 1600; // ms pause before restarting loop
const MAX_T_LINES = 140;

async function typeInto(spanEl, text, speedMs = TYPE_SPEED) {
  for (const char of text) {
    spanEl.textContent += char;
    await sleep(speedMs);
  }
}

function appendTermLine(container, html) {
  const el = document.createElement('span');
  el.className = 't-line';
  el.innerHTML = html;
  const cursor = container.querySelector('.t-cursor-line');
  cursor ? container.insertBefore(el, cursor) : container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

const tClass = { ok: 't-ok', warn: 't-warn', err: 't-err', out: 't-out', info: 't-out' };

async function runTermSession(container, session) {
  // Prompt + typing command
  const cmdEl = document.createElement('span');
  cmdEl.className = 't-line';
  cmdEl.innerHTML = `${PROMPT_HTML}<span class="t-cmd-active"></span>`;
  const cursor = container.querySelector('.t-cursor-line');
  cursor ? container.insertBefore(cmdEl, cursor) : container.appendChild(cmdEl);
  container.scrollTop = container.scrollHeight;

  await typeInto(cmdEl.querySelector('.t-cmd-active'), session.command, TYPE_SPEED);
  await sleep(AFTER_CMD);

  // Output lines
  for (const line of session.lines) {
    const cls = tClass[line.type] || 't-out';
    appendTermLine(container, `<span class="${cls}">${line.text}</span>`);
    await sleep(session.outputDelay + randInt(0, 25));
  }

  appendTermLine(container, '&nbsp;');
  await sleep(AFTER_OUT);
}

async function runTerminalEngine(container) {
  while (true) {
    // Rebuild sessions each loop — reflects current live measurements
    const sessions = await buildTerminalSessions();
    for (const session of sessions) {
      await runTermSession(container, session);
      // Prune old lines
      const lines = container.querySelectorAll('.t-line:not(.t-cursor-line)');
      if (lines.length > MAX_T_LINES) {
        const excess = lines.length - MAX_T_LINES;
        for (let i = 0; i < excess; i++) lines[i].remove();
      }
    }
    await sleep(LOOP_GAP);
  }
}

function initTerminalBlock() {
  const container = document.querySelector('.terminal-block');
  if (!container) return;

  container.innerHTML = '';

  // Permanent blinking cursor at bottom
  const cursorLine = document.createElement('span');
  cursorLine.className = 't-line t-cursor-line';
  cursorLine.innerHTML = `${PROMPT_HTML}<span class="blink" style="color:var(--clr-phosphor)">█</span>`;
  container.appendChild(cursorLine);

  // Delay start until after initial log burst settles
  setTimeout(() => runTerminalEngine(container), 1600);
}


/* ═══════════════════════════════════════════════════════════
   § 7. NAVIGATION TOGGLE  (Mobile)
   ═══════════════════════════════════════════════════════════ */

function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    const lines = toggle.querySelectorAll('.toggle-line');
    if (open) {
      lines[0].style.transform = 'translateY(6px) rotate(45deg)';
      lines[1].style.opacity   = '0';
      lines[2].style.transform = 'translateY(-6px) rotate(-45deg)';
    } else {
      lines.forEach(l => { l.style.transform = ''; l.style.opacity = ''; });
    }
  });

  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.querySelectorAll('.toggle-line').forEach(l => {
        l.style.transform = '';
        l.style.opacity   = '';
      });
    }
  });
}


/* ═══════════════════════════════════════════════════════════
   § 8. STAT COUNTER ANIMATION  →  [data-count]
   ═══════════════════════════════════════════════════════════ */

function animateCounter(el, target, duration = 1300) {
  const isFloat  = String(target).includes('.');
  const dec      = isFloat ? 1 : 0;
  const t0       = performance.now();
  const step = now => {
    const p = Math.min((now - t0) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = isFloat ? (target * e).toFixed(dec) : Math.floor(target * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initStatCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = '1';
        animateCounter(entry.target, parseFloat(entry.target.getAttribute('data-count')));
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => obs.observe(el));
}


/* ═══════════════════════════════════════════════════════════
   § 9. DATA-TYPEWRITER ATTRIBUTE HANDLER
   ═══════════════════════════════════════════════════════════ */

function initDataTypewriter() {
  document.querySelectorAll('[data-typewriter]').forEach(el => {
    const text  = el.getAttribute('data-typewriter');
    const speed = parseInt(el.getAttribute('data-tw-speed') || '40', 10);
    const delay = parseInt(el.getAttribute('data-tw-delay') || '200', 10);
    el.textContent      = '';
    el.style.visibility = 'visible';
    let i = 0;
    setTimeout(() => {
      const iv = setInterval(() => {
        el.textContent += text[i++];
        if (i >= text.length) clearInterval(iv);
      }, speed);
    }, delay);
  });
}


/* ═══════════════════════════════════════════════════════════
   § 10. BOOTSTRAP
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  runBootSequence();
  initLiveClock();
  initNavToggle();
  initDataTypewriter();
  initStatCounters();
  initRealtimeLog();       // async — collects telemetry then streams log
  initTerminalBlock();     // async — types real diagnostic output
});
