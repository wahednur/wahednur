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

## Not decided yet
- Authentication for the admin dashboard (likely SimpleJWT).
- File storage for uploads (case-study images), if the backend ever serves them.
- Email provider for lead notifications.
