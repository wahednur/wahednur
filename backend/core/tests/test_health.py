from unittest.mock import patch

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from core import tasks

pytestmark = pytest.mark.django_db


def test_health_is_public_and_ok():
    response = APIClient().get("/api/health/")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"database": "up", "cache": "up"},
    }


def test_health_reports_503_when_database_is_down():
    with patch("core.services.check_database", return_value=False):
        response = APIClient().get("/api/health/")
    assert response.status_code == 503
    assert response.json()["checks"]["database"] == "down"
    assert response.json()["status"] == "degraded"


def test_health_reports_503_when_cache_is_down():
    with patch("core.services.check_cache", return_value=False):
        response = APIClient().get("/api/health/")
    assert response.status_code == 503
    assert response.json()["checks"]["cache"] == "down"


def test_api_is_secure_by_default():
    assert settings.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] == [
        "rest_framework.permissions.IsAuthenticated"
    ]


def test_unknown_api_route_is_404_not_a_page():
    response = APIClient().get("/api/does-not-exist/")
    assert response.status_code == 404


def test_celery_task_runs_eagerly_in_tests():
    assert tasks.ping.delay().get() == "pong"
