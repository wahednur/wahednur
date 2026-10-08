from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import AuditEvent
from catalog.models import Order, Package, Service
from documents import storage
from shop.models import Product, ShippingZone, StockMovement

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "a-very-long-pass-123"


@pytest.fixture(autouse=True)
def _settings(settings, tmp_path):
    settings.REQUIRE_STAFF_MFA = False
    settings.DOCUMENTS_LOCAL_ROOT = tmp_path
    storage.get_storage.cache_clear()


def make_user(email, **extra):
    user = User.objects.create_user(email, PW, **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(user):
    api = APIClient()
    api.force_login(user)
    return api


@pytest.fixture
def staff():
    return make_user("staff@example.com", is_staff=True)


@pytest.fixture
def alice():
    return make_user("alice@example.com")


@pytest.fixture
def api(staff):
    return login(staff)


def vault_file(api, name="book.pdf"):
    r = api.post(
        "/api/documents/",
        {"file": SimpleUploadedFile(name, b"%PDF-1.7 book"), "title": "Book", "category": "other"},
        format="multipart",
    )
    return r.json()["id"]


# --- access ---------------------------------------------------------------------------------
@pytest.mark.parametrize(
    "path",
    ["/api/manage/services/", "/api/manage/products/", "/api/manage/zones/"],
)
def test_only_staff_can_open_the_management_lists(path, alice, api):
    assert api.get(path).status_code == 200
    assert login(alice).get(path).status_code == 403
    assert APIClient().get(path).status_code in (401, 403)


def test_staff_without_two_factor_cannot_manage(staff, settings):
    settings.REQUIRE_STAFF_MFA = True
    assert login(staff).get("/api/manage/services/").status_code == 403


# --- services and packages ---------------------------------------------------------------------
def test_service_and_package_lifecycle(api):
    r = api.post(
        "/api/manage/services/", {"slug": "web", "title": "Web", "summary": "Sites"}, format="json"
    )
    assert r.status_code == 201 and r.json()["published"] is False
    sid = r.json()["id"]
    pkg = {
        "name": "Basic",
        "price": "15000",
        "features": ["5 pages", "Contact form"],
        "published": True,
    }
    r = api.post(f"/api/manage/services/{sid}/packages/", pkg, format="json")
    assert r.status_code == 201 and r.json()["price"] == "15000.00"
    pid = r.json()["id"]
    # hidden service: not on the public price list yet
    assert APIClient().get("/api/catalog/services/").json() == []
    api.put(f"/api/manage/services/{sid}/", {"published": True}, format="json")
    public = APIClient().get("/api/catalog/services/").json()
    assert public[0]["packages"][0]["name"] == "Basic"
    r = api.put(f"/api/manage/packages/{pid}/", {"price": "12000.50"}, format="json")
    assert r.json()["price"] == "12000.50"
    assert api.delete(f"/api/manage/packages/{pid}/").status_code == 204
    assert api.delete(f"/api/manage/services/{sid}/").status_code == 204
    assert AuditEvent.objects.filter(action="package_saved").exists()


@pytest.mark.parametrize(
    "body",
    [
        {"name": "x", "price": "0"},
        {"name": "x", "price": "-5"},
        {"name": "x", "price": "10", "features": ["a"] * 13},
        {"name": "x", "price": "10", "features": ["a" * 121]},
        {"name": "x", "price": "10", "currency": "EUR"},
    ],
)
def test_bad_packages_are_refused(api, body):
    s = Service.objects.create(slug="w", title="W", summary="x")
    assert (
        api.post(f"/api/manage/services/{s.pk}/packages/", body, format="json").status_code == 400
    )


def test_services_and_packages_with_orders_cannot_be_deleted(api, alice):
    s = Service.objects.create(slug="w", title="W", summary="x", published=True)
    p = Package.objects.create(service=s, name="A", price=1, published=True)
    Order.objects.create(
        client=alice, package=p, title="t", unit_price=1, currency="BDT", cycle="one_time"
    )
    assert api.delete(f"/api/manage/packages/{p.pk}/").status_code == 400
    assert api.delete(f"/api/manage/services/{s.pk}/").status_code == 400
    assert Package.objects.filter(pk=p.pk).exists()
    # hiding it is the way out
    assert (
        api.put(f"/api/manage/packages/{p.pk}/", {"published": False}, format="json").status_code
        == 200
    )


def test_duplicate_service_address_is_refused(api):
    body = {"slug": "web", "title": "Web", "summary": "x"}
    assert api.post("/api/manage/services/", body, format="json").status_code == 201
    assert api.post("/api/manage/services/", body, format="json").status_code == 400
    assert (
        api.post("/api/manage/services/", {**body, "slug": "Bad Slug"}, format="json").status_code
        == 400
    )


# --- products ------------------------------------------------------------------------------------
def product(api, **extra):
    body = {"slug": "mug", "title": "Mug", "kind": "physical", "price": "450", **extra}
    r = api.post("/api/manage/products/", body, format="json")
    assert r.status_code == 201, r.content
    return r.json()


def test_product_create_edit_and_public_visibility(api):
    p = product(api)
    assert p["published"] is False and p["stock"] == 0
    assert APIClient().get("/api/shop/products/").json() == []
    r = api.put(
        f"/api/manage/products/{p['id']}/", {"published": True, "price": "500"}, format="json"
    )
    assert r.json()["price"] == "500.00"
    assert [x["slug"] for x in APIClient().get("/api/shop/products/").json()] == ["mug"]


def test_a_products_type_cannot_be_changed_and_prices_must_be_positive(api):
    p = product(api)
    assert (
        api.put(f"/api/manage/products/{p['id']}/", {"kind": "digital"}, format="json").status_code
        == 400
    )
    assert (
        api.put(f"/api/manage/products/{p['id']}/", {"price": "0"}, format="json").status_code
        == 400
    )


def test_stock_adds_and_corrections_are_a_ledger_that_cannot_go_negative(api):
    p = product(api)
    url = f"/api/manage/products/{p['id']}/stock/"
    assert (
        api.post(
            url, {"delta": 10, "reason": "restock", "note": "first batch"}, format="json"
        ).json()["stock"]
        == 10
    )
    assert api.post(url, {"delta": -3, "reason": "adjustment"}, format="json").json()["stock"] == 7
    assert api.post(url, {"delta": -8, "reason": "adjustment"}, format="json").status_code == 400
    assert api.post(url, {"delta": -1, "reason": "restock"}, format="json").status_code == 400
    assert api.post(url, {"delta": 0, "reason": "restock"}, format="json").status_code == 400
    assert (
        api.post(url, {"delta": 1, "reason": "sale"}, format="json").status_code == 400
    )  # orders only
    history = api.get(url).json()
    assert [m["delta"] for m in history] == [-3, 10] and history[1]["by"] == "staff@example.com"
    assert Product.objects.get(pk=p["id"]).stock == 7


def test_downloads_have_no_stock(api):
    p = product(api, slug="book", kind="digital")
    r = api.post(
        f"/api/manage/products/{p['id']}/stock/", {"delta": 1, "reason": "restock"}, format="json"
    )
    assert r.status_code == 400 and p["stock"] is None


def test_a_download_cannot_be_published_without_a_file_and_files_come_from_the_vault(api):
    p = product(api, slug="book", kind="digital")
    url = f"/api/manage/products/{p['id']}/"
    assert api.put(url, {"published": True}, format="json").status_code == 400
    doc = vault_file(api)
    r = api.post(url + "files/", {"document": doc}, format="json")
    assert r.status_code == 201 and r.json()["files"][0]["title"] == "Book"
    assert api.put(url, {"published": True}, format="json").status_code == 200
    # the last file of a live product cannot be pulled out from under buyers
    assert api.delete(f"{url}files/{doc}/").status_code == 400
    api.put(url, {"published": False}, format="json")
    assert api.delete(f"{url}files/{doc}/").status_code == 204


def test_new_download_products_cannot_start_published(api):
    r = api.post(
        "/api/manage/products/",
        {"slug": "b", "title": "B", "kind": "digital", "price": "5", "published": True},
        format="json",
    )
    assert r.status_code == 400


def test_files_must_be_real_vault_documents_and_only_for_downloads(api):
    book = product(api, slug="book", kind="digital")
    mug = product(api, slug="mug2", kind="physical")
    fake = "00000000-0000-0000-0000-000000000000"
    assert (
        api.post(
            f"/api/manage/products/{book['id']}/files/", {"document": fake}, format="json"
        ).status_code
        == 404
    )
    doc = vault_file(api)
    assert (
        api.post(
            f"/api/manage/products/{mug['id']}/files/", {"document": doc}, format="json"
        ).status_code
        == 400
    )


def test_ordered_products_cannot_be_deleted_but_unordered_ones_can(api, alice):
    from shop.services import create_order

    p = product(api)
    api.post(
        f"/api/manage/products/{p['id']}/stock/", {"delta": 5, "reason": "restock"}, format="json"
    )
    api.put(f"/api/manage/products/{p['id']}/", {"published": True}, format="json")
    zone = ShippingZone.objects.create(name="D", fee=Decimal("5"))
    create_order(
        customer=alice,
        items=[{"product": Product.objects.get(pk=p["id"]), "quantity": 1}],
        zone=zone,
        ship={"name": "A", "phone": "1", "address": "x"},
    )
    assert api.delete(f"/api/manage/products/{p['id']}/").status_code == 400
    q = product(api, slug="other")
    assert api.delete(f"/api/manage/products/{q['id']}/").status_code == 204
    assert (
        not Product.objects.filter(pk=q["id"]).exists()
        and not StockMovement.objects.filter(product_id=q["id"]).exists()
    )


# --- delivery areas ----------------------------------------------------------------------------------
def test_zones_crud_and_protection(api, alice):
    r = api.post("/api/manage/zones/", {"name": "Dhaka", "fee": "60"}, format="json")
    assert r.status_code == 201 and r.json()["fee"] == "60.00"
    zid = r.json()["id"]
    assert (
        api.post("/api/manage/zones/", {"name": "x", "fee": "-1"}, format="json").status_code == 400
    )
    assert (
        api.put(f"/api/manage/zones/{zid}/", {"active": False}, format="json").json()["active"]
        is False
    )
    assert APIClient().get("/api/shop/zones/").json() == []  # inactive areas are not offered
    api.put(f"/api/manage/zones/{zid}/", {"active": True}, format="json")
    assert len(APIClient().get("/api/shop/zones/").json()) == 1
    assert api.delete(f"/api/manage/zones/{zid}/").status_code == 204


def test_a_zone_used_by_an_order_cannot_be_deleted(api, alice):
    from shop.services import create_order

    p = Product.objects.create(
        slug="m", title="M", kind="physical", price=Decimal("10"), published=True
    )
    StockMovement.objects.create(product=p, delta=5, reason="restock")
    zone = ShippingZone.objects.create(name="D", fee=Decimal("5"))
    create_order(
        customer=alice,
        items=[{"product": p, "quantity": 1}],
        zone=zone,
        ship={"name": "A", "phone": "1", "address": "x"},
    )
    assert api.delete(f"/api/manage/zones/{zone.pk}/").status_code == 400
