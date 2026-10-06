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
