# TOTP Tester

A deliberately minimal static website with a username/password login and
optional TOTP (time-based one-time password) MFA. Built for testing **recorded
logins in Burp Suite DAST**.

It is a pure static site — HTML, CSS and vanilla JS, no backend and no build
step. All "auth" happens in the browser and is fake; it exists only to exercise
a realistic login + second-factor flow.

## Pages

| Page             | Purpose                                                          |
| ---------------- | --------------------------------------------------------------- |
| `index.html`     | Login. Prompts for the TOTP code as a second step if MFA is on. |
| `account.html`   | Dummy post-login page. Shows MFA status, logout.                |
| `mfa-setup.html` | Enroll / manage TOTP MFA (QR code, secret, confirm code).       |

## Test account

```
username: carlos
password: hunter2
```

## How it works

- **Login session** is stored in `sessionStorage` (cleared when the tab closes).
- **MFA enrollment** is stored in `localStorage` and persists per browser/origin.
  MFA starts **disabled**; enroll it on the setup page.
- **TOTP** is standard RFC 6238: SHA-1, 6 digits, 30-second period, generated in
  the browser via the Web Crypto API (no third-party TOTP library).
- QR codes are rendered locally with a vendored copy of
  [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) — no
  external network calls.

> **Secure-context requirement:** `crypto.subtle` only works over `https://` or
> `http://localhost`. Opening the files via `file://` will not work.

## Login flow

1. Go to `index.html`, enter `carlos` / `hunter2`.
2. If MFA is **disabled**, you land on the account page immediately.
3. If MFA is **enabled**, you're asked for the current 6-digit code, then land
   on the account page.

## Setting up MFA

1. Log in and open **Set up MFA** from the account page.
2. Scan the QR code with an authenticator app, or copy the **Base32 secret** /
   **otpauth URI** into Burp's TOTP configuration.
3. Enter the current 6-digit code to enable MFA. The setup page also shows the
   live current code + countdown to make manual testing easy.

## Using with Burp Suite DAST

1. Enroll MFA in the browser you'll record the login from, and **keep the
   Base32 secret** shown on the setup page.
2. Record the login: username → password → TOTP code.
3. Configure Burp's TOTP with that Base32 secret (SHA-1 / 6 digits / 30s) so it
   can generate matching codes on replay.

> **Note:** because this is a pure static site, the secret is generated per
> browser at enrollment and stored in that browser's `localStorage`. The
> recorded login must use the secret from the same enrolled browser.

## Running locally

Any static server over `localhost` works, e.g.:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying to Netlify

- **Drag & drop:** drop this folder onto the Netlify dashboard.
- **CLI:** `netlify deploy --prod` from this directory.
- **Git:** connect the repo; `netlify.toml` sets publish dir `.` and no build
  command.
