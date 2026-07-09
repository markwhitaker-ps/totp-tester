// Client-side "auth" state for the TOTP test site. All state lives in the
// browser: a login session in sessionStorage, MFA enrollment in localStorage.
// This is deliberately fake — it exists only to exercise a login + TOTP flow.
(function () {
  'use strict';

  const USERNAME = 'carlos';
  const PASSWORD = 'hunter2';

  const Auth = {
    USERNAME,

    // --- credentials ---
    checkCredentials(u, p) {
      return u === USERNAME && p === PASSWORD;
    },

    // --- MFA enrollment (persists per browser) ---
    isMfaEnabled() {
      return localStorage.getItem('mfaEnabled') === 'true';
    },
    getSecret() {
      return localStorage.getItem('mfaSecret');
    },
    enableMfa(secret) {
      localStorage.setItem('mfaSecret', secret);
      localStorage.setItem('mfaEnabled', 'true');
    },
    disableMfa() {
      localStorage.removeItem('mfaSecret');
      localStorage.removeItem('mfaEnabled');
    },

    // Verify a submitted code against the enrolled secret.
    async verifyEnrolledCode(code) {
      const secret = this.getSecret();
      if (!secret) return false;
      return TOTP.verify(secret, code);
    },

    // --- login session (cleared when the tab/browser closes) ---
    startSession() {
      sessionStorage.setItem('authed', USERNAME);
    },
    isAuthed() {
      return sessionStorage.getItem('authed') === USERNAME;
    },
    logout() {
      sessionStorage.removeItem('authed');
    },

    // Redirect to login if there's no active session.
    requireAuth() {
      if (!this.isAuthed()) location.replace('index.html');
    },
    // Redirect to account if already logged in.
    redirectIfAuthed() {
      if (this.isAuthed()) location.replace('account.html');
    },
  };

  window.Auth = Auth;
})();
