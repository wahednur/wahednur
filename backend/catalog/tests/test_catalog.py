from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from billing.models import Quotation
from catalog.models import Order, Package, Service
from projects.models import Project
from subscriptions.models import Subscription

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "a-very-long-pass-123"


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False


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
def web():
    return Service.objects.create(
        slug="web", title="Web development", summary="Sites", published=True
    )


@pytest.fixture
def basic(web):
    return Package.objects.create(
        service=web,
        name="Basic",
        price=Decimal("15000.00"),
        features=["5 pages"],
        delivery_days=7,
        revisions=2,
        published=True,
    )


@pytest.fixture
def hosting(web):
    return Package.objects.create(
        service=web, name="Hosting", price=Decimal("500.00"), cycle="monthly", published=True
    )


# --- public price list ------------------------------------------------------------
def test_price_list_is_public_and_hides_unpublished(web, basic):
    Package.objects.create(service=web, name="Secret", price=1, published=False)
    Service.objects.create(slug="draft", title="Draft", summary="x", published=False)
    r = APIClient().get("/api/catalog/services/")
    assert r.status_code == 200 and "public" in r["Cache-Control"]
    assert [s["slug"] for s in r.json()] == ["web"]
    assert [p["name"] for p in r.json()[0]["packages"]] == ["Basic"]
    assert r.json()[0]["packages"][0]["price"] == "15000.00"  # exact string
    assert APIClient().get("/api/catalog/services/draft/").status_code == 404
    assert APIClient().get("/api/catalog/services/web/").status_code == 200


# --- ordering ---------------------------------------------------------------------
def order(user, package, note="Please start soon"):
    return login(user).post(
        "/api/catalog/orders/", {"package": package.pk, "note": note}, format="json"
    )


def test_anonymous_cannot_order(basic):
    r = APIClient().post("/api/catalog/orders/", {"package": basic.pk}, format="json")
    assert r.status_code in (401, 403)


def test_order_copies_the_price_and_notifies_the_owner(alice, basic):
    r = order(alice, basic)
    assert r.status_code == 201 and r.json()["status"] == "requested"
    assert r.json()["unit_price"] == "15000.00" and len(mail.outbox) == 1
    basic.price = Decimal("99999")  # a later price change must not touch the order
    basic.save()
    assert Order.objects.get().unit_price == Decimal("15000.00")


def test_no_duplicate_open_requests_and_unpublished_cannot_be_ordered(alice, basic, web):
    assert order(alice, basic).status_code == 201
    assert order(alice, basic).status_code == 400
    hidden = Package.objects.create(service=web, name="Hidden", price=1, published=False)
    assert order(alice, hidden).status_code == 404


def test_orders_are_private(alice, bob, staff, basic):
    oid = order(alice, basic).json()["id"]
    assert [o["id"] for o in login(alice).get("/api/catalog/orders/").json()] == [oid]
    assert login(bob).get("/api/catalog/orders/").json() == []
    assert len(login(staff).get("/api/catalog/orders/").json()) == 1
    assert login(bob).post(f"/api/catalog/orders/{oid}/cancel/").status_code == 404
    assert login(alice).post(f"/api/catalog/orders/{oid}/accept/").status_code == 403


def test_accepting_a_one_time_package_makes_a_project_and_a_draft_quotation(alice, staff, basic):
    oid = order(alice, basic).json()["id"]
    r = login(staff).post(f"/api/catalog/orders/{oid}/accept/")
    assert r.status_code == 200 and r.json()["status"] == "accepted"
    project = Project.objects.get()
    assert project.client == alice and project.title == "Web development - Basic"
    q = Quotation.objects.get()
    assert q.status == "draft" and q.items.get().unit_price == Decimal("15000.00")
    assert not Subscription.objects.exists()
    # The client cannot see the draft yet; staff still has to send it.
    assert login(alice).get("/api/quotations/").json() == []
    assert login(staff).post(f"/api/catalog/orders/{oid}/accept/").status_code == 400


def test_accepting_a_recurring_package_starts_a_subscription(alice, staff, hosting):
    oid = order(alice, hosting).json()["id"]
    login(staff).post(f"/api/catalog/orders/{oid}/accept/")
    sub = Subscription.objects.get()
    assert sub.cycle == "monthly" and sub.unit_price == Decimal("500.00") and sub.status == "active"
    assert Project.objects.get().status == "active" and not Quotation.objects.exists()


def test_decline_and_cancel(alice, staff, basic, hosting):
    first = order(alice, basic).json()["id"]
    second = order(alice, hosting).json()["id"]
    assert login(staff).post(f"/api/catalog/orders/{first}/decline/").json()["status"] == "declined"
    assert (
        login(alice).post(f"/api/catalog/orders/{second}/cancel/").json()["status"] == "cancelled"
    )
    assert login(alice).post(f"/api/catalog/orders/{second}/cancel/").status_code == 400
    assert not Project.objects.exists()
