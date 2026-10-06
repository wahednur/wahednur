# PROGRESS

**Last updated:** 2026-10-06 (session 4)

## Done
- Previous site moved to `legacy/` (history preserved).
- `frontend/` Next.js scaffold (Next 16, Tailwind 4), design tokens, header, footer.
- Home page: hero, selected work (3 labelled projects), services, process, about, roadmap (planned), contact. Résumé PDF at `/Abdul_Wahed_Nur_Resume.pdf`.
- Pages: `/work` (index), `/work/[slug]` (3 case studies: ekhaneikini, service-parts-management, education-management-demo), `/services`, `/about`, `/contact`, `sitemap.xml`, `robots.txt`. Content lives in `frontend/src/lib/` (`caseStudies.ts`, `services.ts`, `site.ts`).
- Contact form (name, email, need, details, optional budget/timeline) builds a `mailto:` message; no backend yet.
- Verified: `npm run build`, `npm run lint`, no horizontal scroll at 390 px and 1366 px on every page, contact form builds the mailto.

- **Backend foundation** (`backend/`): Django 5.2 + DRF, split settings (base/dev/prod/test), environment-driven config, PostgreSQL, Redis cache, Celery app and smoke task, CORS allow-list, secure-by-default DRF permissions, non-default Django admin URL, `/api/health/` (DB + cache), 6 pytest tests, ruff config, `requirements/`, `.env.example`, `docs/ARCHITECTURE.md`.
- Verified for real (not only in tests): runserver + health 200, CORS allows only `localhost:3000`/`5173`, a real Celery worker consumed the Redis queue and returned `pong`, production settings refuse to start without `SECRET_KEY`, `check --deploy` shows only the optional HSTS-preload warning.

- **Leads API** (`backend/leads/`): `POST /api/leads/` (public, write-only). Validated fields (name, email, need, details, optional budget/timeline), honeypot field `website`, rate limit 5/hour per client address, IP stored only as a keyed hash. Saved first, then a Celery task emails the owner through Resend after the DB commit (retry with backoff, idempotency key so a retry never double-sends, enquiry is kept even if email fails). All user text is escaped in the HTML email; subject uses only fixed labels. Django admin lists leads read-only. 25 new tests (31 total).
- Verified end to end: real server + real Celery/Redis worker + real PostgreSQL; the worker's actual HTTP request to a local stand-in for Resend had the right URL, bearer header, idempotency key, `reply_to` and escaped HTML. Real Resend was not reachable from this environment.

## In progress
Nothing.

## Next
1. Add real screenshots: put files in `frontend/public/work/<slug>/` and fill `screenshots` in `caseStudies.ts` (the gallery only renders when non-empty).
2. OpenGraph image, favicon/brand mark, per-page social previews.
3. Owner to review all page copy (see Known issues).
4. **Wire the contact form to `POST /api/leads/`** (frontend session): map the form's labels to the API codes (`ecommerce`, `business_app`, ...), add the hidden `website` honeypot field, show success/error and rate-limit (429) messages, keep `mailto:` only as a fallback. Needs `NEXT_PUBLIC_API_URL`.
5. Owner: create a Resend account, verify the sending domain (until then `onboarding@resend.dev` can only send to the account owner's own address), set `RESEND_API_KEY`, `LEADS_FROM_EMAIL`, `LEADS_NOTIFY_TO` in the host env.
6. Admin dashboard (`admin/`, React + Vite) and its authentication (SimpleJWT).

## Known issues
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
