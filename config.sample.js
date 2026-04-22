// ════════════════════════════════════════════════════════════════
//  0XRWISE CONFIG — SAMPLE / TEMPLATE
//  COPY file ini → rename jadi config.js
//  config.js ada di .gitignore, JANGAN di-commit!
// ════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── GITHUB (untuk baca file dari repo) ──────────────────────
  GITHUB_USER : 'YOUR_GITHUB_USERNAME',     // contoh: '0xrwise'
  GITHUB_REPO : 'YOUR_GITHUB_REPO',         // contoh: 'notes'
  GITHUB_TOKEN: 'YOUR_GITHUB_PAT_TOKEN',    // Personal Access Token (read:contents)

  // ── ADMIN LOGIN ──────────────────────────────────────────────
  // PANEL_USERNAME     : nama user yang diinput di form login
  // PANEL_PASSWORD_HASH: SHA256 dari password kamu
  //   → cara generate: buka console browser, ketik:
  //     CryptoJS.SHA256('password_kamu').toString()
  PANEL_USERNAME     : 'YOUR_USERNAME',           // contoh: '0xrwise'
  PANEL_PASSWORD_HASH: 'YOUR_SHA256_HASH_HERE',   // SHA256 dari password

  // ── TELEGRAM HONEYPOT ALERT ──────────────────────────────────
  // Buat bot: chat @BotFather di Telegram → /newbot
  // Dapatkan chat_id: chat @userinfobot atau @getmyid_bot
  TELEGRAM: {
    ENABLED  : false,                        // ganti ke true jika sudah diisi
    BOT_TOKEN: 'YOUR_BOT_TOKEN',             // contoh: '7123456789:AAHxxxxxxxx'
    CHAT_ID  : 'YOUR_CHAT_ID',              // contoh: '123456789' (pribadi) atau '-100xxx' (grup)
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
