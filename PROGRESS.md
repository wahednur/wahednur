# PROGRESS

**Last updated:** 2026-10-06 (session 8)

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

## In progress
Nothing.

## Next
0a. Owner: deploy using `docs/DEPLOYMENT.md` (VPS, DNS, Resend domain, secrets). Report anything that differs from the doc and it will be fixed.
0. **Owner to confirm the services lineup** (draft is in the code; see Known issues for what to check) before the site goes live.
1. Add real screenshots: put files in `frontend/public/work/<slug>/` and fill `screenshots` in `caseStudies.ts` (the gallery only renders when non-empty).
2. OpenGraph image, favicon/brand mark, per-page social previews.
3. Owner to review all page copy (see Known issues).
4. Owner: create a Resend account, verify the sending domain (until then `onboarding@resend.dev` can only send to the account owner's own address), set `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_NOTIFY_TO` in the host env.
5. Admin dashboard (`admin/`, React + Vite) and its authentication (SimpleJWT).

## Known issues
- Confirm before launch: (1) whether the AI features are switched on in the live store (provider keys set in production); the site says they are *built into the platform*, not that they are live. (2) The "How I use AI when I build" section discloses AI-assisted development. It is true (the ekhaneikini repo is built that way) but it is the owner's choice to publish; delete `aiWorkflow` in `services.ts` to remove it. (3) "What I do not offer" says Messenger/WhatsApp bots and SaaS builds are not for sale yet; change it when that stops being true.
- `NEXT_PUBLIC_API_URL` is baked in at build time. Set it in the host's build environment (Vercel/Dokploy), then rebuild; changing it at runtime has no effect. Add the site's real origin to the API's `CORS_ALLOWED_ORIGINS`.
- The 5/hour limit counts per address. Several people behind one shared network (office, mobile carrier NAT) share it.
- The ekhaneikini screenshot (`frontend/public/work/ekhaneikini/home.png`, from the old test site) shows an "EKAI" promo banner while EKAI is only planned. Replace it with a fresh screenshot of the live store, or accept the banner.
- `@types/node` is `^20`; align with the Node LTS you run locally.
- Leads email has never been sent through the real Resend (blocked here). First real test after the key exists: submit the form once and confirm the email arrives and `notified_at` is set in Django admin.
- `NUM_PROXIES` must match the proxies in front of the API (Dokploy/Traefik is usually 1). Wrong value = rate limit keys on the wrong address.
- Lead text is stored as typed (not HTML-escaped); it is escaped on output (email, Django admin). Any future dashboard must escape it too (React does by default).
- No auto-reply to the enquirer on purpose: it would let strangers make the site email arbitrary addresses.
- `backend/.env` is local only and ignored by git; recreate it from `.env.example` on each machine.
- HSTS preload is intentionally not enabled (hard to undo); decide before launch.
- No Dockerfile or deploy config yet (Phase 6).
- Copy to confirm with the owner: "source code and handover" (process step), "Deployment setup" as a service, the About line that the 2020-21 eCommerce system code was written by others, the EMIS case study (no stack listed because it is unconfirmed), and the "Budget" ranges on the contact form (suggestions, not prices).
- An unknown `/work/<slug>` returns 200 with `noindex` on the first request (documented Next.js behavior with Cache Components); `dynamicParams` is not allowed with `cacheComponents`.
- Footer year is hardcoded (cache-components blocks `new Date()`); update yearly or move to a client component.
- Contact is a `mailto:` link until the backend exists.
- Project and résumé links were provided by the owner but not opened from this environment (blocked); open each once on a phone before launch.
- Résumé PDF contains the owner's public phone and email; replace the file when the résumé changes.
