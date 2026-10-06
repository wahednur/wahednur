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

## Version policy
- Use the newest **LTS** where one exists (Django, PostgreSQL major, Node), the newest stable where none does (React, Next.js).
- Django: 5.2 LTS now. Django 6.0 is not LTS, so it is skipped. Move to the next LTS (6.2, expected April 2027) when it ships and the deprecation warnings are clean.
- Next.js is pinned exactly (16.4.0) because minor releases changed APIs (Cache Components); upgrade deliberately, read `node_modules/next/dist/docs` first.
- Python packages use compatible ranges in `requirements/`; a lock file is added before the first deploy.
- PostgreSQL 18.6 is the target. The sandbox used for development sessions only has PostgreSQL 16, so run `pytest` on your own PostgreSQL 18 machine before each merge.

## Not decided yet
- Authentication for the admin dashboard (likely SimpleJWT).
- File storage for uploads (case-study images), if the backend ever serves them.
