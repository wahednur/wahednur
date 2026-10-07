# PROGRESS

**Last updated:** 2026-10-06 (session 18)

## Done
- Earlier test portfolio (`legacy/`) deleted at the owner's request; history keeps it. Only the ekhaneikini home screenshot was kept (now on its case study).
- `frontend/` Next.js scaffold (Next 16, Tailwind 4), design tokens, header, footer.
- Home page: hero, selected work (3 labelled projects), services, process, about, roadmap (planned), contact. Résumé PDF at `/Abdul_Wahed_Nur_Resume.pdf`.
- Pages: `/work` (index), `/work/[slug]` (3 case studies: ekhaneikini, service-parts-management, education-management-demo), `/services`, `/about`, `/contact`, `sitemap.xml`, `robots.txt`. Content lives in `frontend/src/lib/` (`caseStudies.ts`, `services.ts`, `site.ts`).
- Contact form (name, email, need, details, optional budget/timeline) builds a `mailto:` message; no backend yet.
- Verified: `npm run build`, `npm run lint`, no horizontal scroll at 390 px and 1366 px on every page, contact form builds the mailto.

- **Backend foundation** (`backend/`): Django 5.2 + DRF, split settings (base/dev/prod/test), environment-driven config, PostgreSQL, Redis cache, Celery app and smoke task, CORS allow-list, secure-by-default DRF permissions, non-default Django admin URL, `/api/health/` (DB + cache), 6 pytest tests, ruff config, `requirements/`, `.env.example`, `docs/ARCHITECTURE.md`.
- Verified for real (not only in tests): runserver + health 200, CORS allows only `localhost:3000`/`5173`, a real Celery worker consumed the Redis queue and returned `pong`, production settings refuse to start without `SECRET_KEY`, `check --deploy` shows only the optional HSTS-preload warning.

- **Leads API** (`backend/leads/`): `POST /api/leads/` (public, write-only). Validated fields (name, email, need, details, optional budget/timeline), honeypot field `website`, rate limit 5/hour per client address, IP stored only as a keyed hash. Saved first, then a Celery task emails the owner through Resend after the DB commit (retry with backoff, idempotency key so a retry never double-sends, enquiry is kept even if email fails). All user text is escaped in the HTML email; subject uses only fixed labels. Django admin lists leads read-only. 25 new tests (31 total).
- Verified end to end: real server + real Celery/Redis worker + real PostgreSQL; the worker's actual HTTP request to a local stand-in for Resend had the right URL, bearer header, idempotency key, `reply_to` and escaped HTML. Real Resend was not reachable from this environment.

- Version audit: Next 16.4.0, React 19.3.0, Django 5.2.18 (latest LTS), psycopg 3.3, Celery 5.6 confirmed installed; version table in README; version policy in ARCHITECTURE.

- **Contact form wired to the Leads API** (`frontend/src/components/ContactForm.tsx`): posts to `${NEXT_PUBLIC_API_URL}/api/leads/`; sending/disabled state, success panel, per-field errors from 400, rate-limit (429), server (500) and network-failure messages (each with a direct-email fallback), invisible honeypot field, accessible (`aria-invalid`, live regions). Without `NEXT_PUBLIC_API_URL` it falls back to the old `mailto:` flow. Option values live in `src/lib/leadOptions.ts` and must match `backend/leads/models.py`.
- Verified in a real browser against the real API, Celery worker, Redis and PostgreSQL: success, payload, form reset, 400/429/500/network-failure handling, honeypot invisible and unreachable by keyboard, a real 429 from the API shown in the UI, no horizontal scroll on mobile, and the `mailto:` fallback build.

- **Deployment files** (Dokploy, Docker Compose): `docker-compose.yml` (frontend, api, worker, db=postgres:18, redis:8), `backend/Dockerfile` (multi-stage, non-root, gunicorn, collectstatic, health probe, migrations only on `api`), `frontend/Dockerfile` (Next.js standalone, Node 24, non-root), `.env.example`, `docs/DEPLOYMENT.md` (steps, backups, env reference, troubleshooting). WhiteNoise added for admin static files (prod only). Fonts now come from the `geist` package, not Google Fonts, so builds no longer need the internet.
- Verified with real Docker (PostgreSQL 18.6, Redis 8.10, Node 24.21): see the list in `docs/DEPLOYMENT.md`. Backend tests also pass on PostgreSQL 18.6. Not verified: Dokploy UI, real TLS/Traefik, Cloudflare, real Resend delivery.

- **Services rewritten for the AI era** (`frontend/src/lib/services.ts`, shown on Home and `/services`): seven services, a new "AI features for business software" service, a "How I use AI when I build" section, an updated "What I do not offer" list, and an AI question in the FAQ. Based on what the ekhaneikini repo actually contains (grounded product Q&A, AI-assisted search, draft descriptions and SEO text, comparison summaries, staff reply suggestions, provider fallback, cost tracking), not on plans. The ekhaneikini case study was corrected: it wrongly said AI was only planned.
- Marketplace and LinkedIn texts were rewritten to match (`Profiles_v2`, delivered as a file in the session).

- **Screenshot tool** (`tools/screenshots/`, Playwright + sharp): one command takes the portfolio screenshots of the live sites at fixed sizes (desktop 1440x900, mobile 390x844 @2x), full-page option, optional WebP, `manifest.json`. Admin pages use a saved login (`npm run login -- admin`). Privacy check stops a shot if a phone number or email that is not allow-listed is visible (blur/hide/allowText in the config). Refuses order-placing clicks, blocks analytics/ad pixels. Prefilled for ekhaneikini (storefront and admin routes taken from its repo). Tested here against the new site: sizes, mobile, full page, click flow, blur, privacy block (including text typed into a field), login-required skip, order-click guard, bad-selector error. Not run against the live ekhaneikini, Admin or meter sites (not reachable from this environment). Meter steps (`meter-*`) were added from that app's source; see the README section.

- Branch renamed to **`portfolio`** (old long name still exists on GitHub; delete it in Settings > Branches or with `git push origin --delete claude/portfolio-resume-restructure-s0u5qz`).
- EMIS case study completed from the `lms-demo` repo (stack, screens, five simulated roles, no backend, browser storage); home card stack filled in. No sensitive files found in that repo.
- OpenGraph/Twitter share image and a site icon added (replaces the default Next.js favicon); `@types/node` set to ^24 (Node LTS).

- **Images everywhere**: case-study cards (home and /work) now have a cover; case pages show the cover on top; home hero shows the ekhaneikini screenshot in a browser frame; About has the owner's photo; service and process cards have icons (lucide-react). EMIS images are real screenshots of the demo (sample data). The service-system cover is a labelled workflow *diagram*, not a screenshot (the real app needs login and real data).
- **Package manager is bun** (owner's choice): `frontend/bun.lock` is the lockfile, `package-lock.json` removed, `frontend/Dockerfile` installs with `oven/bun` and builds/runs on Node 24 (verified with a real Docker build and run).
- Fixed a build break from the footer's `new Date()` (Cache Components forbids it while prerendering) with `components/Year.tsx`; header image alt text fixed; duplicate `src/app/wahednur.jpg` and the generated `icon.png` removed (owner's favicon is used).

- **Plain-VPS deployment path** (owner's choice; Dokploy and Vercel gave trouble): compose profiles (`proxy` = Caddy with automatic HTTPS, `frontend` = optional site), `deploy/Caddyfile`, `deploy/backup.sh`, `docs/VPS.md` (server setup, firewall, DNS, `.env`, Vercel hookup, backups, updates, troubleshooting). Verified in real Docker: profile selection, Caddy config validity, and backup, restore (250/250 rows on PostgreSQL 18.6), pruning, and failure handling. Not verified: real certificates, DNS, Resend.

- **`main` is now the project**: `portfolio` merged into `main`; the previous site lives on in branch `backup/old-site` and tag `old-site` (commit 9cdfa2b). Vercel must use Root Directory `frontend` (see docs/VPS.md §5).

- Vercel fix: `output: "standalone"` is now only enabled for the Docker build (`NEXT_OUTPUT=standalone` in the Dockerfile), so Vercel uses the default Next.js build; added `frontend/vercel.json`. 502 diagnosis steps added to `docs/VPS.md` §8.

- Deploy hardening after the owner's 502: container health check now uses `/api/health/live/` (no dependency checks), entrypoint run via `sh`, `.gitattributes` forces LF line endings, and the failure modes (missing env, unreachable DB with migrations on, bad Redis URL, wrong ALLOWED_HOSTS) were reproduced with the real image and written into `docs/VPS.md`.

- **Email login**: custom `accounts.User` (email is the login, lowercase, unique ignoring case), admin registration, 11 new tests (45 total) including admin login by email and `createsuperuser`; verified `migrate` + `createsuperuser` on an empty PostgreSQL database. **An existing database must be reset once** (steps in `docs/VPS.md` §4) before this version is deployed.
- `Download resume` spelling done; `NEXT_PUBLIC_API_URL` set on Vercel by the owner.

- **Sign-in backend (phase 1)**: django-allauth headless, email code verification, password reset by code, Google (when keys are set), set-password after Google, TOTP two-factor required for staff and owner (API and Django admin), roles (owner/staff/client), DRF permission classes, `/api/auth/me/`, audit trail, Resend email backend (Celery), CSRF/CORS/cookie settings for the www/api split, branded emails. 82 tests pass; verified end to end over real HTTP (CSRF cookie, signup, code, HttpOnly session cookie, `/api/auth/me/`, missing CSRF 403, evil origin 403, logout). See `docs/AUTH.md`.

## In progress
Nothing.

## Next
- **Owner, in order:** (1) make `bike-meter-service-erp` private and rotate its secrets, remove the DB dump from its history; (2) buy/prepare VPS, DNS `api.wahednur.tech`, Resend domain + key; (3) follow `docs/VPS.md`; (4) set `NEXT_PUBLIC_API_URL` and Root Directory `frontend` in Vercel; (5) run the screenshot tool and send images; (6) merge `portfolio` into `main` (tag `old-site` first); (7) update LinkedIn/Upwork/Fiverr/Guru with `Profiles_v2`; (8) confirm the AI claims and the EMIS naming.
- Add real screenshots (owner runs `tools/screenshots`; send the files).
- Deploy per `docs/DEPLOYMENT.md`, merge `portfolio` into `main` and point the host at `frontend/`.
0a. Owner: deploy using `docs/DEPLOYMENT.md` (VPS, DNS, Resend domain, secrets). Report anything that differs from the doc and it will be fixed.
0. **Owner to confirm the services lineup** (draft is in the code; see Known issues for what to check) before the site goes live.
1. Add real screenshots: put files in `frontend/public/work/<slug>/` and fill `screenshots` in `caseStudies.ts` (the gallery only renders when non-empty).
2. OpenGraph image, favicon/brand mark, per-page social previews.
3. Owner to review all page copy (see Known issues).
4. Owner: create a Resend account, verify the sending domain (until then `onboarding@resend.dev` can only send to the account owner's own address), set `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_NOTIFY_TO` in the host env.
5. Admin dashboard (`admin/`, React + Vite) and its authentication (SimpleJWT).

## Known issues
- **SECURITY (other repo, owner informed):** `wahednur/bike-meter-service-erp` is public and contains `backend/neon_backup.sql`, a database dump with customer names, phones, addresses and emails, and user password hashes. It must be made private, removed from history, and all passwords and the secret key rotated. Nothing in this repo is affected.
- `tools/screenshots/shots.config.json` has guessed admin URL (`https://admin.ekhaneikini.com`), meter login path and the meter shot is off; selectors such as the product link and "Add to cart" come from the repo but must be confirmed on the live site (`--headed` to watch).
- Confirm before launch: (1) whether the AI features are switched on in the live store (provider keys set in production); the site says they are *built into the platform*, not that they are live. (2) The "How I use AI when I build" section discloses AI-assisted development. It is true (the ekhaneikini repo is built that way) but it is the owner's choice to publish; delete `aiWorkflow` in `services.ts` to remove it. (3) "What I do not offer" says Messenger/WhatsApp bots and SaaS builds are not for sale yet; change it when that stops being true.
- `NEXT_PUBLIC_API_URL` is baked in at build time. Set it in the host's build environment (Vercel/Dokploy), then rebuild; changing it at runtime has no effect. Add the site's real origin to the API's `CORS_ALLOWED_ORIGINS`.
- The 5/hour limit counts per address. Several people behind one shared network (office, mobile carrier NAT) share it.
- The EMIS screenshots show the institute's initials in the sidebar and the demo is public with its full name; the site text does not name it. Ask the institute before naming it in copy. The ekhaneikini screenshot (`frontend/public/work/ekhaneikini/home.png`, from the old test site) shows an "EKAI" promo banner while EKAI is only planned. Replace it with a fresh screenshot of the live store, or accept the banner.
- Leads email has never been sent through the real Resend (blocked here). First real test after the key exists: submit the form once and confirm the email arrives and `notified_at` is set in Django admin.
- `NUM_PROXIES` must match the proxies in front of the API (Dokploy/Traefik is usually 1). Wrong value = rate limit keys on the wrong address.
- Lead text is stored as typed (not HTML-escaped); it is escaped on output (email, Django admin). Any future dashboard must escape it too (React does by default).
- No auto-reply to the enquirer on purpose: it would let strangers make the site email arbitrary addresses.
- `backend/.env` is local only and ignored by git; recreate it from `.env.example` on each machine.
- HSTS preload is intentionally not enabled (hard to undo); decide before launch.
- No Dockerfile or deploy config yet (Phase 6).
- Copy to confirm with the owner: "source code and handover" (process step), "Deployment setup" as a service, the About line that the 2020-21 eCommerce system code was written by others, and the "Budget" ranges on the contact form (suggestions, not prices).
- An unknown `/work/<slug>` returns 200 with `noindex` on the first request (documented Next.js behavior with Cache Components); `dynamicParams` is not allowed with `cacheComponents`.
- Contact is a `mailto:` link until the backend exists.
- Project and résumé links were provided by the owner but not opened from this environment (blocked); open each once on a phone before launch.
- Résumé PDF contains the owner's public phone and email; replace the file when the résumé changes.

- **Sign-in frontend (phase 1–2)**: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, private `/app` area and `/app/security` (password change/set, TOTP QR, recovery codes). `proxy.ts` gives optimistic redirects (no cookie -> login; cookie -> away from login/register); `AuthGate` + `/api/auth/me/` is authoritative. Browser E2E (Playwright, real API) passes, including TOTP login and reset. Google button appears only when the API lists the provider.
- **Next**: phase 3 (R2 private document vault), then clients and projects.
