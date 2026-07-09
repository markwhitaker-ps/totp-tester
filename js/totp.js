// Minimal, dependency-free TOTP (RFC 6238) using the browser's Web Crypto API.
// SHA-1, 6 digits, 30s step. Exposed as a global `TOTP` object.
//
// NOTE: crypto.subtle requires a secure context, so this only works over
// https:// or http://localhost (not file://).
(function () {
  'use strict';

  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const DIGITS = 6;
  const PERIOD = 30; // seconds

  function base32Encode(bytes) {
    let bits = 0, value = 0, out = '';
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        out += B32[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
  }

  function base32Decode(str) {
    const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0, value = 0;
    const out = [];
    for (let i = 0; i < clean.length; i++) {
      value = (value << 5) | B32.indexOf(clean[i]);
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  // Generate a fresh random Base32 secret (default 20 bytes / 160 bits).
  function generateSecret(byteLength = 20) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return base32Encode(bytes);
  }

  async function hotp(secretBytes, counter) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter >>> 0);

    const key = await crypto.subtle.importKey(
      'raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));

    const offset = sig[sig.length - 1] & 0x0f;
    const bin =
      ((sig[offset] & 0x7f) << 24) |
      ((sig[offset + 1] & 0xff) << 16) |
      ((sig[offset + 2] & 0xff) << 8) |
      (sig[offset + 3] & 0xff);
    return (bin % 10 ** DIGITS).toString().padStart(DIGITS, '0');
  }

  // Current TOTP code for a Base32 secret.
  async function generate(secretBase32, at = Date.now()) {
    const counter = Math.floor(at / 1000 / PERIOD);
    return hotp(base32Decode(secretBase32), counter);
  }

  // Verify a code, tolerating +/- `window` steps of clock skew.
  async function verify(secretBase32, code, window = 1) {
    const target = String(code).trim();
    if (!/^\d{6}$/.test(target)) return false;
    const secretBytes = base32Decode(secretBase32);
    const counter = Math.floor(Date.now() / 1000 / PERIOD);
    for (let w = -window; w <= window; w++) {
      if ((await hotp(secretBytes, counter + w)) === target) return true;
    }
    return false;
  }

  // Build an otpauth:// URI for enrolling authenticator apps / Burp.
  function otpauthUri(secret, account = 'carlos', issuer = 'TOTP Tester') {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  // Seconds remaining in the current 30s window (for the countdown display).
  function secondsRemaining(at = Date.now()) {
    return PERIOD - (Math.floor(at / 1000) % PERIOD);
  }

  window.TOTP = { generateSecret, generate, verify, otpauthUri, secondsRemaining, PERIOD };
})();
