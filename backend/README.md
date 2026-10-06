# Backend

Django 5.2 LTS + Django REST Framework, PostgreSQL, Redis, Celery.

## Local setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
cp .env.example .env        # then edit SECRET_KEY and DATABASE_URL
python manage.py migrate
python manage.py runserver  # http://localhost:8000/api/health/
```

You need PostgreSQL and Redis running locally. Redis databases: `0` Celery broker, `1` Django cache.

Run a worker only when you need background tasks:

```bash
celery -A config worker -l info
```

## Tests and lint

```bash
pytest
ruff check . && ruff format --check .
```

## Settings

`config/settings/` is split: `base` (shared), `dev`, `prod`, `test`. Production fails to start if `SECRET_KEY` or `DATABASE_URL` is missing. See `.env.example`.

## Rules

- Business logic lives in `services.py`, not in views or serializers.
- The API is secure by default: `IsAuthenticated` unless a view opts out with `AllowAny`.
- The Django admin sits at `ADMIN_URL` (not `/admin/`); the owner dashboard is the separate React app.

## Leads API

`POST /api/leads/` (public). Body: `name`, `email`, `need` (`ecommerce`, `business_app`, `admin_dashboard`, `backend_api`, `improve_existing`, `other`), `details` (10-5000 chars), optional `budget` and `timeline`, and a hidden honeypot `website` that must stay empty. Returns `201 {"detail": "received"}`, `400` with field errors, or `429` when rate limited (5 per hour per address).

Email goes through Resend. Set `RESEND_API_KEY`, `LEADS_FROM_EMAIL` (a verified domain address) and `LEADS_NOTIFY_TO`. With no key (local dev) the message is logged by the worker instead of sent. Production refuses to start without a key.
