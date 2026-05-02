/**
 * ============================================================
 * 0XRWISE // SIGINT STATION — assets/js/main.js
 * CLASSIFICATION: UNCLASSIFIED // FIELD DEPLOYMENT BUILD
 * ============================================================
 */

'use strict';

/* ── BOOT SEQUENCE ─────────────────────────────────────────── */
const BOOT_SEQUENCE = [
  { delay: 0,    msg: '%c[BOOT]%c  Initializing SIGINT Station kernel...',          style: 'color:#00ff41;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 120,  msg: '%c[INIT]%c  Loading memory modules... 512MB OK',             style: 'color:#00e5ff;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 260,  msg: '%c[NET] %c  Establishing encrypted uplink... TOR ACTIVE',     style: 'color:#00ff41;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 400,  msg: '%c[AUTH]%c  Verifying agent credentials...',                  style: 'color:#ffb300;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 560,  msg: '%c[AUTH]%c  Identity confirmed: 0xrfi // CLEARANCE: TS/SCI', style: 'color:#00ff41;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 700,  msg: '%c[SEC] %c  Scanning environment for anomalies...',           style: 'color:#ffb300;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 860,  msg: '%c[SEC] %c  No threats detected. Perimeter CLEAN.',           style: 'color:#00ff41;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 1000, msg: '%c[SYS] %c  Mounting /intel ... OK',                          style: 'color:#00e5ff;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 1150, msg: '%c[SYS] %c  Mounting /tools  ... AWAITING DEPLOYMENT',        style: 'color:#ffb300;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 1300, msg: '%c[SYS] %c  Starting dashboard services...',                  style: 'color:#00e5ff;font-weight:700', rst: 'color:#c8ffc8' },
  { delay: 1500, msg: '%c[  ✓ ]%c  SIGINT STATION ONLINE // JAKARTA FIELD OFFICE',  style: 'color:#00ff41;font-weight:900;font-size:1.1em', rst: 'color:#c8ffc8;font-weight:700' },
];

function runBootSequence() {
  console.clear();
  console.log(
    '%c╔══════════════════════════════════════════════════╗\n' +
    '║    0XRWISE // SIGINT STATION v2.0 [CLASSIFIED]  ║\n' +
    '╚══════════════════════════════════════════════════╝',
    'color:#00ff41; font-family: monospace; font-size: 0.85em; font-weight: 700;'
  );

  BOOT_SEQUENCE.forEach(({ delay, msg, style, rst }) => {
    setTimeout(() => console.log(msg, style, rst), delay);
  });
}

/* ── NAVIGATION TOGGLE (MOBILE) ────────────────────────────── */
function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));

    // Animate hamburger → X
    const lines = toggle.querySelectorAll('.toggle-line');
    if (isOpen) {
      lines[0].style.transform = 'translateY(6px) rotate(45deg)';
      lines[1].style.opacity   = '0';
      lines[2].style.transform = 'translateY(-6px) rotate(-45deg)';
    } else {
      lines[0].style.transform = '';
      lines[1].style.opacity   = '';
      lines[2].style.transform = '';
    }
  });

  // Close nav on outside click
  document.addEventListener('click', (e) => {
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

/* ── LIVE CLOCK ─────────────────────────────────────────────── */
function initLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;

  function tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    el.textContent =
      `${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())} ` +
      `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
  }

  tick();
  setInterval(tick, 1000);
}

/* ── TYPEWRITER (for elements with data-typewriter) ─────────── */
function initTypewriter() {
  const els = document.querySelectorAll('[data-typewriter]');
  els.forEach(el => {
    const fullText  = el.getAttribute('data-typewriter');
    const speed     = parseInt(el.getAttribute('data-tw-speed') || '40', 10);
    const startDelay = parseInt(el.getAttribute('data-tw-delay') || '200', 10);
    el.textContent  = '';
    el.style.visibility = 'visible';

    let i = 0;
    setTimeout(() => {
      const interval = setInterval(() => {
        el.textContent += fullText[i];
        i++;
        if (i >= fullText.length) clearInterval(interval);
      }, speed);
    }, startDelay);
  });
}

/* ── LOG ENTRY FADE-IN ──────────────────────────────────────── */
function initLogAnimation() {
  const entries = document.querySelectorAll('.log-entry');
  entries.forEach((entry, idx) => {
    entry.style.opacity = '0';
    entry.style.transform = 'translateX(-8px)';
    entry.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    setTimeout(() => {
      entry.style.opacity   = '1';
      entry.style.transform = 'translateX(0)';
    }, 1600 + idx * 60); // after boot sequence completes
  });
}

/* ── STAT COUNTER ANIMATION ─────────────────────────────────── */
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const isFloat = String(target).includes('.');
  const decimals = isFloat ? 1 : 0;

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = target * eased;

    el.textContent = isFloat
      ? current.toFixed(decimals)
      : Math.floor(current).toString();

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function initStatCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = '1';
        const target = parseFloat(entry.target.getAttribute('data-count'));
        animateCounter(entry.target, target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  runBootSequence();
  initNavToggle();
  initLiveClock();
  initTypewriter();
  initLogAnimation();
  initStatCounters();
});
