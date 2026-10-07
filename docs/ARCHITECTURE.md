# Architecture decisions

Short record of what was chosen and why.

1. **Monorepo, three separate apps** (`backend/`, `frontend/`, `admin/`). Dependencies are never shared, so each can be deployed and upgraded alone.
2. **Django 5.2 LTS + DRF.** Long support window, strong structure for business rules, permissions and data. Matches the owner's main backend direction.
3. **PostgreSQL only.** No SQLite in any environment, so dev, tests and production behave the same.
4. **Redis for two jobs on separate databases**: `0` Celery broker and results, `1` Django cache. A cache flush never touches queued jobs.
5. **Secure by default API.** `DEFAULT_PERMISSION_CLASSES` is `IsAuthenticated`. A public endpoint must say `AllowAny` explicitly, so a forgotten setting fails closed.
6. **Settings from the environment** (`django-environ`). `prod` has no fallback for `SECRET_KEY`, so a misconfigured deploy fails loudly instead of running with a default.
7. **CORS allow-list** limited to the site and admin origins.
8. **Business logic in `services.py`.** Views stay thin; services are easy to test.
9. **Django admin on a non-default URL.** The owner dashboard will be the React app; Django admin is a back-office fallback.
10. **Health endpoint** (`/api/health/`) checks database and cache and returns 503 when degraded, for deploy probes.
11. **Leads are saved before anything else, email is a background task.** A provider outage can never lose an enquiry; the Celery task retries with backoff, and an idempotency key stops duplicate emails on retry.
12. **Resend over SMTP**: one HTTPS call, clear error codes, already used on the previous site. Called through a thin `emailer.py`, so swapping provider touches one file.
13. **Public form protection in layers**: strict validation with fixed choice lists, honeypot, per-address rate limit, hashed IP, no auto-reply, escaped output.
14. **No auto-reply emails**: sending mail to an address a stranger typed is an abuse vector.
15. **One Compose stack including database and Redis**: simplest to deploy and restore on a single VPS. Trade-off: backups are the owner's job (see DEPLOYMENT.md); a managed database would remove that burden at extra cost.
16. **Migrations run only in the `api` container** (`RUN_MIGRATIONS=1`), never in the worker, so two containers cannot race on the schema.
17. **Containers run as non-root**, expose no host ports and carry a health check; the API probe sends proxy headers so it is not redirected or rejected.
18. **Static files**: WhiteNoise (prod only) serves the Django admin assets, no separate web server needed.
19. **Frontend as Next.js `standalone` output** in a Node 24 image; fonts come from the `geist` package so builds never depend on Google Fonts being reachable.
20. **`NUM_PROXIES` is explicit**: the rate limiter trusts exactly that many proxy hops, so a wrong value either shares one limit across everyone (too low) or lets clients spoof their address (too high).
21. **Custom user model with email login** (`accounts.User`, `AUTH_USER_MODEL`), chosen at the very start because swapping later means rebuilding the database. Email is the only identifier (no username), stored lowercase and unique ignoring case. The future owner dashboard will authenticate the same users.
22. **Sign-in is django-allauth (headless) with HttpOnly session cookies**, not hand-written and not JWT in the browser. Session cookie `wn_sid` is HttpOnly, SameSite=Lax, shared by `www` and `api` through `COOKIE_DOMAIN`; the CSRF cookie is readable so the site can echo it in `X-CSRFToken`. Email codes (not links) for verification and password reset; Google by redirect flow; TOTP for two-factor.
23. **Authorization is decided by the API on every request** (DRF permission classes: verified user, staff + 2FA, owner + 2FA). The Next.js proxy and pages only mirror it for a good experience.
24. **Staff and owner need two-factor authentication** (`REQUIRE_STAFF_MFA`), including for the Django admin, whose login is routed through allauth.
25. **Google and password both work for one account**: a Google sign-in joins an existing account only when the email is verified; someone who started with Google can set a password later and use either.
26. **Audit trail** of sign-ins, failures, password and 2FA changes (no secrets stored, IP kept only as a keyed hash).
27. **Frontend origins are trusted automatically** for CORS, CSRF and the post-Google redirect, from one list, so a forgotten setting cannot silently break sign-in.

## Version policy
- Use the newest **LTS** where one exists (Django, PostgreSQL major, Node), the newest stable where none does (React, Next.js).
- Django: 5.2 LTS now. Django 6.0 is not LTS, so it is skipped. Move to the next LTS (6.2, expected April 2027) when it ships and the deprecation warnings are clean.
- Next.js is pinned exactly (16.4.0) because minor releases changed APIs (Cache Components); upgrade deliberately, read `node_modules/next/dist/docs` first.
- Python packages use compatible ranges in `requirements/`; a lock file is added before the first deploy.
- PostgreSQL 18.6 is the target. The sandbox used for development sessions only has PostgreSQL 16, so run `pytest` on your own PostgreSQL 18 machine before each merge.

## Not decided yet
- Authentication for the admin dashboard (likely SimpleJWT).
- File storage for uploads (case-study images), if the backend ever serves them.

## Document vault (phase 3)
- Contracts and invoices are private. The bucket has no public access and no public domain; files are never linked directly.
- Upload goes through the API (type allow-list, magic-byte check, size limit, our own random storage key), so every file is checked before it is stored.
- Download: the API checks access on every request, then returns a link that works for 5 minutes (R2 presigned URL). Locally the link is a signed API URL bound to the same user.
- Staff see all documents; a client sees only documents of theirs that were explicitly shared. "Not yours" and "does not exist" both answer 404.
- Delete is soft (file kept). Every upload, download and delete is written to the audit trail.
- R2 setup: create a private bucket; create an API token with Object Read & Write for that bucket only; set the four `R2_PRIVATE_*` variables (the `R2_*` set is the separate public bucket for site assets). No CORS needed because the browser never uploads to R2 directly.

## Clients and projects (phase 4)
- A client is a normal account; `ClientProfile` holds business details and private notes. Staff pick a client by email.
- Progress is never stored: it is the share of milestones marked done, so it cannot disagree with the work list.
- Status moves only along allowed paths (a proposal cannot jump to completed; cancelled is final; completed can be reopened).
- Clients read their own projects and public notes. Internal notes are filtered on the server. Only staff with 2FA can write.
- A document uploaded to a project is assigned to that project's client automatically.

## Quotations and invoices (phase 5)
- Money is Decimal end to end and leaves the API as strings (a float would show 20000.4000000000014).
- A quotation is the offer; accepting it does not bill anything. Converting an accepted quotation creates a draft invoice with a payment plan; the plan must add up to the total exactly (the last percent installment absorbs rounding).
- Issued invoices are frozen (cancel and recreate instead). Paid state per installment is calculated from the payment list in order, so it can never disagree with the payments.
- Payments are recorded by staff (with 2FA). A row is locked while recording so two payments cannot overpay together.
- Recurring cycles (monthly, yearly) are stored on items now; automatic recurring billing comes with subscriptions (phase 7).
- PDFs are generated on demand with reportlab (no system packages, English text; Bengali glyphs need an embedded font, planned).

## Accounting (phase 6)
- Owner only (superuser + 2FA). Staff can run projects and billing but cannot read the books.
- Single source of truth: income is the invoice payments, so a report can never disagree with an invoice. Only expenses are stored in `accounting`.
- Everything is per currency; BDT and USD are never added together (no exchange rate is invented).
- Cancelled invoices are excluded from income; drafts never count. "Still owed" is the outstanding balance of issued invoices; "overdue" is the unpaid part of installments past their due date.
- CSV export prefixes cells that start with `= + - @` so a spreadsheet cannot run them as formulas.
