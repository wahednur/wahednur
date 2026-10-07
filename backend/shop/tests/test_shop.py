from datetime import timedelta
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from billing import services as billing
from billing.models import Invoice
from documents import storage
from projects.models import Project
from shop import services, tasks
from shop.models import Product, ProductFile, ShippingZone, ShopOrder, StockMovement

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "a-very-long-pass-123"
SHIP = {"name": "Rahim", "phone": "01700000000", "address": "House 1, Road 2, Sherpur"}


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
def bob():
    return make_user("bob@example.com")


@pytest.fixture
def zone():
    return ShippingZone.objects.create(name="Dhaka", fee=Decimal("60.00"))


@pytest.fixture
def mug(staff):
    p = Product.objects.create(
        slug="mug", title="Mug", kind="physical", price=Decimal("450.00"), published=True
    )
    StockMovement.objects.create(product=p, delta=5, reason="restock", created_by=staff)
    return p


@pytest.fixture
def ebook(staff):
    p = Product.objects.create(
        slug="ebook", title="E-book", kind="digital", price=Decimal("300.00"), published=True
    )
    r = login(staff).post(
        "/api/documents/",
        {
            "file": SimpleUploadedFile("book.pdf", b"%PDF-1.7 secret book"),
            "title": "Book",
            "category": "other",
        },
        format="multipart",
    )
    ProductFile.objects.create(product=p, document_id=r.json()["id"])
    return p


def order(user, lines, zone=None, ship=None, **extra):
    body = {"items": [{"product": s, "quantity": q} for s, q in lines], **extra}
    if zone:
        body["shipping_zone"] = zone.pk
    if ship is not None:
        body["shipping"] = ship
    return login(user).post("/api/shop/orders/", body, format="json")


def pay(staff, oid, **body):
    return login(staff).post(f"/api/shop/orders/{oid}/confirm-payment/", body, format="json")


# --- public catalogue ---------------------------------------------------------------------
def test_catalogue_is_public_hides_unpublished_and_shows_no_counts(mug, ebook):
    Product.objects.create(slug="draft", title="Draft", kind="digital", price=1, published=False)
    rows = APIClient().get("/api/shop/products/").json()
    assert {r["slug"] for r in rows} == {"mug", "ebook"}
    mug_row = next(r for r in rows if r["slug"] == "mug")
    assert mug_row["in_stock"] is True and "stock" not in mug_row  # availability, not pressure
    assert mug_row["price"] == "450.00"
    assert APIClient().get("/api/shop/products/draft/").status_code == 404
    StockMovement.objects.create(product=mug, delta=-5, reason="adjustment")
    assert APIClient().get("/api/shop/products/mug/").json()["in_stock"] is False


# --- placing orders ---------------------------------------------------------------------------
def test_login_is_required_to_order(mug, zone):
    r = APIClient().post("/api/shop/orders/", {"items": [{"product": "mug"}]}, format="json")
    assert r.status_code in (401, 403)


def test_physical_order_reserves_stock_and_creates_an_issued_invoice(alice, mug, zone):
    r = order(alice, [("mug", 2)], zone, SHIP)
    assert r.status_code == 201, r.content
    o = r.json()
    assert o["status"] == "awaiting_payment" and o["number"].startswith("SHP-")
    assert o["total"] == "960.00" and o["shipping_fee"] == "60.00"  # 2 x 450 + 60
    assert mug.stock == 3  # reserved immediately
    inv = Invoice.objects.get()
    assert inv.status == "issued" and inv.project.is_system and billing.total(inv) == Decimal("960")
    assert any(m.to == ["alice@example.com"] for m in mail.outbox)  # invoice email


def test_cannot_buy_more_than_is_in_stock(alice, mug, zone):
    assert order(alice, [("mug", 6)], zone, SHIP).status_code == 400
    assert order(alice, [("mug", 5)], zone, SHIP).status_code == 201
    assert mug.stock == 0
    assert order(alice, [("mug", 1)], zone, SHIP).status_code == 400  # sold out


def test_the_last_unit_goes_to_one_buyer_only(alice, bob, mug, zone):
    StockMovement.objects.create(product=mug, delta=-4, reason="adjustment")  # 1 left
    assert order(alice, [("mug", 1)], zone, SHIP).status_code == 201
    assert order(bob, [("mug", 1)], zone, SHIP).status_code == 400


@pytest.mark.parametrize(
    "ship",
    [
        None,
        {},
        {"name": "x", "phone": "", "address": "y"},
        {"name": "", "phone": "1", "address": "y"},
    ],
)
def test_delivery_details_are_required_for_physical_items(alice, mug, zone, ship):
    assert order(alice, [("mug", 1)], zone, ship).status_code == 400
    assert mug.stock == 5 and not ShopOrder.objects.exists()


def test_physical_order_needs_a_delivery_zone(alice, mug):
    assert order(alice, [("mug", 1)], None, SHIP).status_code == 400


def test_digital_only_order_needs_no_address_or_shipping(alice, ebook):
    o = order(alice, [("ebook", 1)]).json()
    assert o["shipping_fee"] == "0.00" and o["total"] == "300.00"


def test_digital_is_bought_once_and_needs_a_file(alice, ebook, zone):
    assert order(alice, [("ebook", 2)]).status_code == 400
    Product.objects.create(slug="empty", title="Empty", kind="digital", price=100, published=True)
    assert order(alice, [("empty", 1)]).status_code == 400  # nothing to deliver yet


def test_mixed_currencies_and_hidden_products_are_refused(alice, mug, ebook, zone):
    Product.objects.create(
        slug="usd", title="USD thing", kind="digital", price=5, currency="USD", published=True
    )
    assert order(alice, [("mug", 1), ("usd", 1)], zone, SHIP).status_code == 400
    Product.objects.filter(slug="mug").update(published=False)
    assert order(alice, [("mug", 1)], zone, SHIP).status_code == 400
    assert order(alice, [], zone, SHIP).status_code == 400


def test_prices_come_from_the_server_never_the_client(alice, mug, zone):
    body = {
        "items": [{"product": "mug", "quantity": 1, "unit_price": "1.00"}],
        "shipping_zone": zone.pk,
        "shipping": SHIP,
        "total": "1",
    }
    o = login(alice).post("/api/shop/orders/", body, format="json").json()
    assert o["total"] == "510.00"


def test_an_order_keeps_its_price_when_the_product_changes(alice, mug, zone):
    o = order(alice, [("mug", 1)], zone, SHIP).json()
    Product.objects.filter(slug="mug").update(price=Decimal("9999"), title="Renamed")
    again = login(alice).get(f"/api/shop/orders/{o['id']}/").json()
    assert again["total"] == "510.00" and again["items"][0]["title"] == "Mug"


# --- manual payment ----------------------------------------------------------------------------
def test_customer_claims_payment_and_staff_confirms(alice, staff, mug, zone):
    o = order(alice, [("mug", 1)], zone, SHIP).json()
    r = login(alice).post(
        f"/api/shop/orders/{o['id']}/claim/", {"method": "bkash", "reference": "TX9"}, format="json"
    )
    assert r.json()["status"] == "payment_review" and r.json()["claimed"]["reference"] == "TX9"
    assert r.json()["expires_at"] is None  # waiting for a check: not released behind their back
    r = pay(staff, o["id"])
    assert r.status_code == 200, r.content
    assert r.json()["status"] == "processing" and r.json()["paid"] is True
    p = Invoice.objects.get().payments.get()
    assert p.method == "bkash" and p.reference == "TX9" and p.amount == Decimal("510.00")
    assert pay(staff, o["id"]).status_code == 400  # already paid


def test_claim_needs_a_reference_and_customers_cannot_confirm_payment(alice, mug, zone):
    o = order(alice, [("mug", 1)], zone, SHIP).json()
    claim = login(alice).post(
        f"/api/shop/orders/{o['id']}/claim/", {"method": "bkash", "reference": "  "}, format="json"
    )
    assert claim.status_code == 400
    assert pay(alice, o["id"]).status_code == 403


def test_staff_can_confirm_straight_from_the_invoice_screen_too(alice, staff, ebook):
    o = order(alice, [("ebook", 1)]).json()
    inv = Invoice.objects.get()
    billing.record_payment(
        invoice=inv, user=staff, amount=Decimal("300"), method="cash", paid_on=timezone.localdate()
    )
    assert login(alice).get(f"/api/shop/orders/{o['id']}/").json()["status"] == "completed"


# --- cancelling and releasing ----------------------------------------------------------------------
def test_cancelling_returns_stock_and_closes_the_invoice(alice, mug, zone):
    o = order(alice, [("mug", 2)], zone, SHIP).json()
    assert mug.stock == 3
    r = login(alice).post(f"/api/shop/orders/{o['id']}/cancel/")
    assert r.json()["status"] == "cancelled" and mug.stock == 5
    assert Invoice.objects.get().status == "cancelled"
    assert login(alice).post(f"/api/shop/orders/{o['id']}/cancel/").status_code == 200  # idempotent
    assert mug.stock == 5  # not given back twice


def test_a_paid_order_cannot_be_cancelled(alice, staff, mug, zone):
    o = order(alice, [("mug", 1)], zone, SHIP).json()
    pay(staff, o["id"])
    assert login(alice).post(f"/api/shop/orders/{o['id']}/cancel/").status_code == 400
    assert login(staff).post(f"/api/shop/orders/{o['id']}/cancel/").status_code == 400
    assert mug.stock == 4


def test_stale_unpaid_orders_are_released_but_claimed_ones_wait(alice, bob, mug, zone, settings):
    old = order(alice, [("mug", 1)], zone, SHIP).json()["id"]
    claimed = order(bob, [("mug", 1)], zone, SHIP).json()["id"]
    login(bob).post(
        f"/api/shop/orders/{claimed}/claim/", {"method": "bkash", "reference": "T"}, format="json"
    )
    ShopOrder.objects.update(
        created_at=timezone.now() - timedelta(hours=settings.SHOP_PAYMENT_HOURS + 1)
    )
    assert tasks.release_unpaid_orders() == 1
    assert ShopOrder.objects.get(pk=old).cancelled_at is not None
    assert ShopOrder.objects.get(pk=claimed).cancelled_at is None
    assert mug.stock == 4


def test_fresh_orders_are_not_released(alice, mug, zone):
    order(alice, [("mug", 1)], zone, SHIP)
    assert services.release_unpaid() == 0 and mug.stock == 4


# --- shipping ------------------------------------------------------------------------------------------
def test_shipping_flow_and_email(alice, staff, mug, zone):
    o = order(alice, [("mug", 1)], zone, SHIP).json()["id"]

    def ship():
        return login(staff).post(
            f"/api/shop/orders/{o}/ship/", {"tracking": "SA 123"}, format="json"
        )

    assert ship().status_code == 400  # not paid yet
    pay(staff, o)
    mail.outbox.clear()
    r = ship()
    assert r.json()["status"] == "shipped" and r.json()["tracking"] == "SA 123"
    assert mail.outbox[0].to == ["alice@example.com"]
    assert ship().status_code == 400  # only once
    assert login(alice).post(f"/api/shop/orders/{o}/ship/", {}, format="json").status_code == 403
    assert login(staff).post(f"/api/shop/orders/{o}/deliver/").json()["status"] == "delivered"


def test_digital_orders_cannot_be_shipped(alice, staff, ebook):
    o = order(alice, [("ebook", 1)]).json()["id"]
    pay(staff, o)
    assert login(staff).post(f"/api/shop/orders/{o}/ship/", {}, format="json").status_code == 400


# --- digital downloads ----------------------------------------------------------------------------------
def test_downloads_open_only_after_payment_and_only_for_the_buyer(alice, bob, staff, ebook):
    o = order(alice, [("ebook", 1)]).json()["id"]
    assert login(alice).get(f"/api/shop/orders/{o}/files/").status_code == 400  # not paid
    pay(staff, o)
    links = login(alice).get(f"/api/shop/orders/{o}/files/").json()
    assert len(links) == 1 and links[0]["product"] == "E-book" and links[0]["expires_in"] > 0
    path = links[0]["url"].split("testserver")[1]
    r = login(alice).get(path)
    assert r.status_code == 200 and b"".join(r.streaming_content).startswith(b"%PDF")
    assert "attachment" in r["Content-Disposition"]
    assert login(bob).get(path).status_code == 404  # a leaked link is useless to others
    assert login(bob).get(f"/api/shop/orders/{o}/files/").status_code == 404


def test_the_book_is_not_downloadable_through_the_vault_by_a_buyer(alice, staff, ebook):
    o = order(alice, [("ebook", 1)]).json()["id"]
    pay(staff, o)
    doc = ProductFile.objects.get().document_id
    assert login(alice).get("/api/documents/").json() == []
    assert login(alice).get(f"/api/documents/{doc}/download/").status_code == 404


def test_a_cancelled_or_unpaid_buyer_loses_access(alice, ebook):
    order(alice, [("ebook", 1)])
    doc = ProductFile.objects.get().document_id
    from shop.services import buyer_can_download

    assert buyer_can_download(alice, doc) is False


# --- privacy and permissions -----------------------------------------------------------------------------
def test_customers_only_see_their_own_orders(alice, bob, staff, mug, zone):
    o = order(alice, [("mug", 1)], zone, SHIP).json()["id"]
    assert login(bob).get("/api/shop/orders/").json() == []
    assert login(bob).get(f"/api/shop/orders/{o}/").status_code == 404
    assert login(bob).post(f"/api/shop/orders/{o}/cancel/").status_code == 404
    assert (
        login(bob)
        .post(f"/api/shop/orders/{o}/claim/", {"method": "bkash", "reference": "x"}, format="json")
        .status_code
        == 404
    )
    assert len(login(staff).get("/api/shop/orders/").json()) == 1
    assert APIClient().get("/api/shop/orders/").status_code in (401, 403)


def test_shop_invoices_stay_out_of_the_project_list(alice, staff, mug, zone):
    order(alice, [("mug", 1)], zone, SHIP)
    assert login(alice).get("/api/projects/").json() == []
    assert login(staff).get("/api/projects/").json() == []
    assert Project.objects.filter(is_system=True).count() == 1
    inv = login(alice).get("/api/invoices/").json()[0]
    assert inv["project_system"] is True


def test_shop_sales_appear_in_accounting_as_one_line(alice, bob, staff, mug, zone):
    owner = make_user("owner@example.com", is_staff=True, is_superuser=True)
    for user in (alice, bob):
        o = order(user, [("mug", 1)], zone, SHIP).json()["id"]
        pay(staff, o)
    rows = login(owner).get("/api/accounting/projects/").json()
    assert [r["title"] for r in rows] == ["Shop sales"]
    assert rows[0]["received"] == "1020.00"
    summary = login(owner).get("/api/accounting/summary/").json()["BDT"]
    assert summary["received"] == "1020.00"


def test_stock_is_only_ever_the_sum_of_movements(alice, mug, zone):
    order(alice, [("mug", 2)], zone, SHIP)
    assert [m.delta for m in mug.movements.order_by("id")] == [5, -2]
    assert mug.stock == 3


def test_product_and_stock_changes_refresh_the_public_pages(
    mug, staff, monkeypatch, django_capture_on_commit_callbacks
):
    from cms import tasks as cms_tasks

    sent = []
    monkeypatch.setattr(cms_tasks.revalidate_frontend, "delay", lambda paths: sent.append(paths))
    with django_capture_on_commit_callbacks(execute=True):
        StockMovement.objects.create(product=mug, delta=-5, reason="adjustment", created_by=staff)
    assert sent and "/shop/mug" in sent[-1]
    sent.clear()
    with django_capture_on_commit_callbacks(execute=True):
        Product.objects.filter(pk=mug.pk).first().save()
    assert sent and "/shop" in sent[-1]
