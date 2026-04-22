// ════════════════════════════════════════════════════════════════
//  0XRWISE CONFIG — SAMPLE / TEMPLATE
//  COPY file ini → rename jadi config.js
//  config.js ada di .gitignore, JANGAN di-commit!
//
//  SECURITY FIX: Telegram credentials TIDAK LAGI disimpan di sini.
//  Masukkan Bot Token & Chat ID melalui tab "Settings" di Admin Panel.
//  Credentials akan disimpan di localStorage browser (lokal, tidak pernah
//  ke server/GitHub) dengan key: 'hp_tg_token' dan 'hp_tg_chat'.
// ════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── GITHUB (untuk baca file dari repo) ──────────────────────
  GITHUB_USER : '0xrwise',
  GITHUB_REPO : '0xrwise.github.io',
  // ⚠️ JANGAN isi GITHUB_TOKEN di sini!
  // Token dimasukkan langsung via form login (kolom "Auth Token / PAT")
  // saat login ke admin panel. Token disimpan di sessionStorage (sementara)
  // atau localStorage jika "Remember Token" dicentang.

  // ── ADMIN LOGIN ──────────────────────────────────────────────
  // PANEL_PASSWORD_HASH: SHA256 dari password kamu
  //   → cara generate: buka console browser, ketik:
  //     CryptoJS.SHA256('password_kamu').toString()
  PANEL_USERNAME     : '0xrwise',
  PANEL_PASSWORD_HASH: 'ac6b482c7d0ab5f4e2b1809cf57555f7d7ffd0f9232afbdaf517a2a0b2aa15e3',

  // ── TELEGRAM HONEYPOT ALERT ──────────────────────────────────
  // ⚠️  BOT_TOKEN dan CHAT_ID TIDAK BOLEH diisi di sini!
  //
  //  Mengapa? File config.js bisa terbaca siapapun via browser (View Source).
  //  Bot Token yang bocor memungkinkan penyerang:
  //    1. Mengirim pesan massal dari bot kamu
  //    2. Membaca semua pesan yang diterima bot
  //    3. Menonaktifkan sistem alert honeypot kamu
  //
  //  ✅ Cara aman: Login admin panel → tab "Settings" →
  //     isi Bot Token & Chat ID → klik Save.
  //     Credentials tersimpan di localStorage HANYA di browser kamu.
  TELEGRAM: {
    ENABLED  : false,
    BOT_TOKEN: '',   // ← Biarkan kosong. Isi via Admin Panel > Settings.
    CHAT_ID  : '',   // ← Biarkan kosong. Isi via Admin Panel > Settings.
  },

  // ── HONEYPOT SETTINGS ────────────────────────────────────────
  HONEYPOT: {
    LOGIN_TRAP    : true,
    MAX_ATTEMPTS  : 5,
    LOCKOUT_MIN   : 30,
    URL_TRAP      : true,
    CONSOLE_TRAP  : true,
    SHOW_TERMINAL : true,
  },

};
