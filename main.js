// config.js
// ════════════════════════════════════════════════════════════════
//  0XRWISE CONFIG — FIREBASE & OSINT READY
// ════════════════════════════════════════════════════════════════

// [!] Isi dengan kredensial Firebase kamu
export const firebaseConfig = {
  apiKey: "AIzaSyBM_d3CKT6aTfX9mp4grf8jn-hV_M9rzHI",
  authDomain: "xrwise-site.firebaseapp.com",
  projectId: "xrwise-site",
  storageBucket: "xrwise-site.firebasestorage.app",
  messagingSenderId: "441688287794",
  appId: "1:441688287794:web:ef0d355386820f13912a2b",
  measurementId: "G-33L6SX3XZJ"
};

// [!] Endpoint untuk tool spionisme/OSINT
export const osintEndpoints = {
  ipApi: "https://ipapi.co/json/",
  whois: "https://rdap.arin.net/registry/ip/",
  // Tambahkan endpoint public API lainnya di sini...
};

// Pengaturan Global
const CONFIG = {
  GITHUB_USER : '0xrwise',
  GITHUB_REPO : '0xrwise.github.io',

  TELEGRAM: {
    ENABLED  : false, // Diatur via Admin Panel
  },

  HONEYPOT: {
    LOGIN_TRAP    : true,
    MAX_ATTEMPTS  : 5,
    LOCKOUT_MIN   : 30,
    URL_TRAP      : true,
    CONSOLE_TRAP  : true,
    SHOW_TERMINAL : true,
  },
};

export { CONFIG };

// Menginjeksi CONFIG ke global window agar fungsi lawas di index.html 
// (seperti githubRequest) yang bergantung pada CONFIG tidak error.
window.CONFIG = CONFIG;
