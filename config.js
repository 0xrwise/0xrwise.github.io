// ════════════════════════════════════════════════════════════════
//  0XRWISE CONFIG — SAMPLE / TEMPLATE
//  COPY file ini → rename jadi config.js
//  config.js ada di .gitignore, JANGAN di-commit!
// ════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── GITHUB (untuk baca file dari repo) ──────────────────────
  GITHUB_USER : '0xrwise',     // contoh: '0xrwise'
  GITHUB_REPO : '0xrwise.github.io',         // contoh: 'notes'
  GITHUB_TOKEN: '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',    // Personal Access Token (read:contents)

  // ── ADMIN LOGIN ──────────────────────────────────────────────
  // PANEL_USERNAME     : nama user yang diinput di form login
  // PANEL_PASSWORD_HASH: SHA256 dari password kamu
  //   → cara generate: buka console browser, ketik:
  //     CryptoJS.SHA256('password_kamu').toString()
  PANEL_USERNAME     : '0xrwise',           // contoh: '0xrwise'
  PANEL_PASSWORD_HASH: 'ac6b482c7d0ab5f4e2b1809cf57555f7d7ffd0f9232afbdaf517a2a0b2aa15e3',   // SHA256 dari password

  // ── TELEGRAM HONEYPOT ALERT ──────────────────────────────────
  // Buat bot: chat @BotFather di Telegram → /newbot
  // Dapatkan chat_id: chat @userinfobot atau @getmyid_bot
  TELEGRAM: {
    ENABLED  : false,                        // ganti ke true jika sudah diisi
    BOT_TOKEN: '8642208265:AAFqnR1kEGDiN3jNCFuAFOl_yIsJawAnnEg',             // contoh: '7123456789:AAHxxxxxxxx'
    CHAT_ID  : '7019766006',              // contoh: '123456789' (pribadi) atau '-100xxx' (grup)
  },

  // ── HONEYPOT SETTINGS ─────────────────────────────────────────
  HONEYPOT: {
    // Aktifkan trap login brute-force
    LOGIN_TRAP    : true,
    MAX_ATTEMPTS  : 5,       // maks percobaan login sebelum lockout
    LOCKOUT_MIN   : 30,      // durasi lockout dalam menit

    // Aktifkan URL probe detector
    URL_TRAP      : true,

    // Aktifkan console probe detector (ada yang buka DevTools)
    CONSOLE_TRAP  : true,

    // Tampilkan fake terminal overlay saat honeypot triggered
    SHOW_TERMINAL : true,
  },

};
