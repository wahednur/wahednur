# Sign-in and security

Email is the login. Accounts can use a password, Google, or both.

## What exists (backend)
- Sign up with email and password (12+ characters, common passwords refused), **email verification by code** is mandatory before any sign-in.
- Password reset by code; unknown emails look the same as known ones (no account guessing).
- Rate limits: 5 failed logins per 5 minutes per address and per account, sign-ups and resets limited too.
- **Google sign-in** (redirect flow). A Google login joins an existing account with the same email only when Google has verified it. After Google, a person can **set a password** (`/account/password/change` with only `new_password`) and then sign in either way.
- **Two-factor (TOTP + recovery codes).** Required for staff and owner access to the API and the Django admin (`REQUIRE_STAFF_MFA`).
- Roles: `owner` (superuser), `staff`, `client` (everyone who signs up). The server checks permissions on every request.
- Audit trail (`AuditEvent`): login, logout, failed login, sign-up, password set/changed/reset, 2FA added/removed. No passwords or codes stored.
- Sessions: HttpOnly cookie `wn_sid`, 14 days, shared by `www` and `api` through `COOKIE_DOMAIN=.wahednur.tech`, CSRF protected.

## Endpoints the site uses
All under `/_allauth/browser/v1/` (see `HEADLESS_SERVE_SPECIFICATION` for the live spec): `config`, `auth/signup`, `auth/login`, `auth/email/verify`, `auth/password/request`, `auth/password/reset`, `auth/session` (GET state, DELETE log out), `auth/provider/redirect` (Google), `auth/2fa/authenticate`, `account/password/change`, `account/authenticators/totp`, `account/authenticators/recovery-codes`.
Ours: `GET /api/auth/me/` returns `{id, email, full_name, roles, email_verified, has_password, mfa_enabled}` for the signed-in person.

## Google setup (you do this once)
1. Google Cloud Console, create or choose a project, **APIs & Services > OAuth consent screen** (External; app name, support email; add `wahednur.tech` as an authorised domain).
2. **Credentials > Create credentials > OAuth client ID > Web application.**
   - Authorised JavaScript origins: `https://www.wahednur.tech`
   - Authorised redirect URI: `https://api.wahednur.tech/accounts/google/login/callback/`
   - For local work also add `http://localhost:3000` and `http://localhost:8000/accounts/google/login/callback/`.
3. Put the client ID and secret in the API's environment as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (never in chat or git). Without them the Google button simply does not appear.
4. While the consent screen is in "Testing", only listed test users can sign in. Publish it when ready.

## Production checklist
- `COOKIE_DOMAIN=.wahednur.tech`, `FRONTEND_URL=https://www.wahednur.tech`, `CORS_ALLOWED_ORIGINS` with the site origins, `RESEND_API_KEY` (codes are emailed through it).
- Create the owner with `python manage.py bootstrap_owner --email you@example.com` (superuser with a **verified** email, safe to run again if you are ever locked out), sign in, **set up two-factor immediately** (the API refuses owner actions until you do).
- Keep `REQUIRE_STAFF_MFA=true`.

## Known limits
- If Redis is down, sign-in and sign-up fail (rate limits live in the cache). This is deliberate: security checks never fail open.
- Passkeys (WebAuthn) are supported by the library and can be switched on later.
