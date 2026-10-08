import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import Address

User = get_user_model()
pytestmark = pytest.mark.django_db
ADDR = {"kind": "shipping", "name": "Rahim", "line1": "House 4, Road 2", "city": "Dhaka", "label": "Home"}


def login(email="a@example.com"):
    u = User.objects.create_user(email, "s3cret-pass-123")
    c = APIClient()
    c.force_login(u)
    return u, c


def test_profile_can_be_read_and_changed():
    u, c = login()
    r = c.patch("/api/auth/profile/", {"full_name": "  Rahim Ahmed ", "phone": "01700000000", "company": "Shop Ltd"}, format="json")
    assert r.status_code == 200 and r.data["full_name"] == "Rahim Ahmed"
    u.refresh_from_db()
    assert u.phone == "01700000000" and u.company == "Shop Ltd"
    assert c.get("/api/auth/profile/").data["email"] == "a@example.com"


def test_profile_rejects_overlong_values_and_anonymous():
    _, c = login()
    assert c.patch("/api/auth/profile/", {"full_name": "x" * 200}, format="json").status_code == 400
    assert APIClient().get("/api/auth/profile/").status_code in (401, 403)


def test_first_address_is_default_and_default_moves():
    u, c = login()
    a = c.post("/api/auth/addresses/", ADDR, format="json").data
    assert a["is_default"] is True
    b = c.post("/api/auth/addresses/", {**ADDR, "label": "Office", "is_default": True}, format="json").data
    assert b["is_default"] is True
    assert Address.objects.get(pk=a["id"]).is_default is False
    assert Address.objects.filter(user=u, kind="shipping", is_default=True).count() == 1


def test_billing_and_shipping_defaults_are_separate():
    u, c = login()
    c.post("/api/auth/addresses/", ADDR, format="json")
    c.post("/api/auth/addresses/", {**ADDR, "kind": "billing", "tax_id": "BIN-1"}, format="json")
    assert Address.objects.filter(user=u, is_default=True).count() == 2


def test_required_fields_and_delete_promotes_next_default():
    u, c = login()
    assert c.post("/api/auth/addresses/", {"kind": "shipping", "name": "x"}, format="json").status_code == 400
    a = c.post("/api/auth/addresses/", ADDR, format="json").data
    b = c.post("/api/auth/addresses/", {**ADDR, "label": "Office"}, format="json").data
    assert c.delete(f"/api/auth/addresses/{a['id']}/").status_code == 204
    assert Address.objects.get(pk=b["id"]).is_default is True


def test_nobody_can_touch_another_users_address():
    _, c1 = login("one@example.com")
    a = c1.post("/api/auth/addresses/", ADDR, format="json").data
    _, c2 = login("two@example.com")
    assert c2.get("/api/auth/addresses/").data == []
    assert c2.patch(f"/api/auth/addresses/{a['id']}/", {"city": "Hacked"}, format="json").status_code == 404
    assert c2.delete(f"/api/auth/addresses/{a['id']}/").status_code == 404
    assert Address.objects.get(pk=a["id"]).city == "Dhaka"
