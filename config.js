// ════════════════════════════════════════════════════════════════
//  0XRWISE CONFIG
// ════════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyBM_d3CKT6aTfX9mp4grf8jn-hV_M9rzHI",
  authDomain: "xrwise-site.firebaseapp.com",
  projectId: "xrwise-site",
  storageBucket: "xrwise-site.firebasestorage.app",
  messagingSenderId: "441688287794",
  appId: "1:441688287794:web:ef0d355386820f13912a2b",
  measurementId: "G-33L6SX3XZJ"
};

const CONFIG = {
  GITHUB_USER : '0xrwise',
  GITHUB_REPO : '0xrwise.github.io',

  TELEGRAM: {
    ENABLED  : false,
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

// Expose ke global
window.CONFIG         = CONFIG;
window.firebaseConfig = firebaseConfig;
