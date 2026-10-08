import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

User = get_user_model()
pytestmark = pytest.mark.django_db


def make_user(email, **extra):
    user = User.objects.create_user(email, "a-very-long-pass-123", **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(user):
    api = APIClient()
    api.force_login(user)
    return api


@pytest.fixture(autouse=True)
def _clean(settings):
    settings.REQUIRE_STAFF_MFA = False
    cache.clear()


def test_oversized_requests_are_refused_before_anything_is_read(settings):
    settings.MAX_REQUEST_BYTES = 1000
    staff = make_user("s@example.com", is_staff=True)
    big = SimpleUploadedFile("a.pdf", b"%PDF-" + b"0" * 5000)
    r = login(staff).post(
        "/api/documents/", {"file": big, "title": "x", "category": "other"}, format="multipart"
    )
    assert r.status_code == 413
    assert "too large" in r.json()["detail"]


def test_normal_sized_requests_pass_the_size_check(settings):
    staff = make_user("s@example.com", is_staff=True)
    ok = SimpleUploadedFile("a.pdf", b"%PDF-1.7 small")
    r = login(staff).post(
        "/api/documents/", {"file": ok, "title": "x", "category": "other"}, format="multipart"
    )
    assert r.status_code == 201


def test_uploads_are_limited_per_user_but_reading_is_not(monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "uploads", "2/hour")
    staff = make_user("s@example.com", is_staff=True)
    other = make_user("t@example.com", is_staff=True)
    api = login(staff)

    def upload(client):
        f = SimpleUploadedFile("a.pdf", b"%PDF-1.7 x")
        return client.post(
            "/api/documents/", {"file": f, "title": "x", "category": "other"}, format="multipart"
        )

    assert upload(api).status_code == 201
    assert upload(api).status_code == 201
    assert upload(api).status_code == 429  # third in the hour
    for _ in range(5):
        assert api.get("/api/documents/").status_code == 200  # listing is never counted
    assert upload(login(other)).status_code == 201  # another user has their own allowance


def test_shop_orders_and_payment_claims_are_limited(monkeypatch):
    from decimal import Decimal

    from shop.models import Product, StockMovement

    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "shop-order", "2/hour")
    p = Product.objects.create(
        slug="mug", title="Mug", kind="physical", price=Decimal("10"), published=True
    )
    StockMovement.objects.create(product=p, delta=50, reason="restock")
    from shop.models import ShippingZone

    zone = ShippingZone.objects.create(name="Dhaka", fee=Decimal("5"))
    api = login(make_user("c@example.com"))
    body = {
        "items": [{"product": "mug", "quantity": 1}],
        "shipping_zone": zone.pk,
        "shipping": {"name": "A", "phone": "1", "address": "x"},
    }
    codes = [api.post("/api/shop/orders/", body, format="json").status_code for _ in range(3)]
    assert codes == [201, 201, 429]
    assert api.get("/api/shop/orders/").status_code == 200


def test_package_orders_are_limited(monkeypatch):
    from decimal import Decimal

    from catalog.models import Package, Service

    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "package-order", "1/hour")
    s = Service.objects.create(slug="w", title="Web", summary="x", published=True)
    pk1 = Package.objects.create(service=s, name="A", price=Decimal("1"), published=True).pk
    pk2 = Package.objects.create(service=s, name="B", price=Decimal("1"), published=True).pk
    api = login(make_user("c@example.com"))
    assert api.post("/api/catalog/orders/", {"package": pk1}, format="json").status_code == 201
    assert api.post("/api/catalog/orders/", {"package": pk2}, format="json").status_code == 429


def test_the_signed_in_user_has_a_general_request_limit_configured(settings):
    from django.conf import settings as s

    from config.settings import base

    rates = base.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    assert (
        "rest_framework.throttling.UserRateThrottle"
        in base.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"]
    )
    assert rates["user"] == "300/min" and rates["uploads"] == "40/hour"
    assert s.MAX_REQUEST_BYTES >= 7 * 1024 * 1024
