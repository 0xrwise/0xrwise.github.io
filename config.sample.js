// ════════════════════════════════════════════════════════════════
//  0XRWISE CONFIG — SAMPLE / TEMPLATE
//  COPY file ini → rename jadi config.js
//  config.js ada di .gitignore, JANGAN di-commit!
//
//  BUG FIX #3: JANGAN taruh token asli di sini!
//  File ini AMAN untuk di-push ke GitHub (hanya contoh/placeholder).
//  Token asli hanya ada di config.js (gitignored).
// ════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── GITHUB (untuk baca file dari repo) ──────────────────────
  GITHUB_USER : '0xrwise',     // contoh: '0xrwise'
  GITHUB_REPO : '0xrwise.github.io',    // contoh: '0xrwise.github.io'
  // ⚠️ JANGAN isi GITHUB_TOKEN di sini!
  // Token dimasukkan langsung via form login (kolom "Auth Token / PAT")
  // saat login ke admin panel. Token disimpan di sessionStorage (sementara)
  // atau localStorage jika "Remember Token" dicentang.
  // Ini jauh lebih aman daripada hardcode di source code.

  // ── ADMIN LOGIN ──────────────────────────────────────────────
  // PANEL_PASSWORD_HASH: SHA256 dari password kamu
  //   → cara generate: buka console browser, ketik:
  //     CryptoJS.SHA256('password_kamu').toString()
  PANEL_USERNAME     : '0xrwise',   // contoh: '0xrwise'
  PANEL_PASSWORD_HASH: '8642208265:AAFqnR1kEGDiN3jNCFuAFOl_yIsJawAnnEg',

  // ── TELEGRAM HONEYPOT ALERT ──────────────────────────────────
  // Buat bot: chat @BotFather di Telegram → /newbot
  // Dapatkan chat_id: chat @userinfobot atau @getmyid_bot
  TELEGRAM: {
    ENABLED  : false,         // Ganti ke true ATAU biarkan false (auto-detect jika token terisi)
    BOT_TOKEN: '8642208265:AAFqnR1kEGDiN3jNCFuAFOl_yIsJawAnnEg',            // Isi token bot kamu: '7123456789:AAHxxxxxxxx'
    CHAT_ID  : '7019766006',            // Isi chat_id kamu: '123456789'
  },

  // ── HONEYPOT SETTINGS ─────────────────────────────────────────
  HONEYPOT: {
    LOGIN_TRAP    : true,
    MAX_ATTEMPTS  : 5,       // maks percobaan login sebelum lockout
    LOCKOUT_MIN   : 30,      // durasi lockout dalam menit
    URL_TRAP      : true,
    CONSOLE_TRAP  : true,
    SHOW_TERMINAL : true,
  },

};
