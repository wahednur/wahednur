"""Business logic lives here, not in views."""

from django.core.cache import cache
from django.db import connection


def check_database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:
        return False


def check_cache() -> bool:
    try:
        cache.set("health:ping", "ok", timeout=5)
        return cache.get("health:ping") == "ok"
    except Exception:
        return False


def health_report() -> dict:
    checks = {"database": check_database(), "cache": check_cache()}
    return {
        "status": "ok" if all(checks.values()) else "degraded",
        "checks": {name: "up" if ok else "down" for name, ok in checks.items()},
    }
