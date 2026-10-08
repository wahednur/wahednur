from datetime import date, timedelta
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from billing import services as billing
from catalog.models import Order as PackageOrder
from catalog.models import Package, Service
from projects.models import ClientProfile, Project
from shop.models import Product, ShippingZone, StockMovement
from subscriptions import services as subs

User = get_user_model()
pytestmark = pytest.mark.django_db
URL = "/api/dashboard/"
TODAY = date.today()


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False


def make_user(email, **extra):
    user = User.objects.create_user(email, "a-very-long-pass-123", **extra)
    EmailAddress.objects.create(user=user, email=email, primary=True, verified=True)
    return user


def login(user):
    api = APIClient()
    api.force_login(user)
    return api


@pytest.fixture
def owner():
    return make_user("owner@example.com", is_staff=True, is_superuser=True)


@pytest.fixture
def staff():
    return make_user("staff@example.com", is_staff=True)


@pytest.fixture
def alice():
    return make_user("alice@example.com")


@pytest.fixture
def bob():
    return make_user("bob@example.com")


def project(client, status="active", title="Shop"):
    return Project.objects.create(client=client, title=title, status=status)


def invoice(user, proj, amount="1000", plan=None, issue=True, currency="BDT"):
    inv = billing.save_invoice(
        user=user,
        project=proj,
        title="x",
        currency=currency,
        discount=Decimal("0"),
        items=[
            {
                "description": "w",
                "quantity": Decimal(1),
                "unit_price": Decimal(amount),
                "cycle": "one_time",
            }
        ],
        installments=plan or [],
    )
    if issue:
        billing.issue_invoice(invoice=inv, user=user)
    return inv


def attention(data):
    return {i["key"]: i["count"] for i in data["attention"]}


def test_only_verified_signed_in_people_see_it(alice):
    assert APIClient().get(URL).status_code in (401, 403)
    unverified = User.objects.create_user("u@example.com", "a-very-long-pass-123")
    assert login(unverified).get(URL).status_code == 403
    r = login(alice).get(URL)
    assert r.status_code == 200 and "no-store" in r["Cache-Control"]


def test_a_new_client_sees_zeros_not_errors(alice):
    data = login(alice).get(URL).json()
    assert data["role"] == "client" and data["attention"] == []
    assert data["stats"]["active_projects"] == 0 and data["money"] == {}


def test_client_sees_only_their_own_numbers(staff, alice, bob):
    p_a, p_b = project(alice, title="A"), project(bob, title="B")
    invoice(staff, p_a, "500")
    invoice(staff, p_b, "9000")
    data = login(alice).get(URL).json()
    assert data["stats"]["active_projects"] == 1 and data["stats"]["open_invoices"] == 1
    assert data["money"]["BDT"]["owed"] == "500.00"
    assert [p["title"] for p in data["projects"]] == ["A"]
    assert attention(data)["invoices"] == 1


def test_client_is_asked_to_answer_a_sent_quotation_and_not_a_draft(staff, alice):
    p = project(alice)
    items = [
        {
            "description": "x",
            "quantity": Decimal(1),
            "unit_price": Decimal(100),
            "cycle": "one_time",
        }
    ]
    sent = billing.save_quotation(
        user=staff, project=p, title="q", currency="BDT", discount=Decimal(0), items=items
    )
    billing.send_quotation(quotation=sent, user=staff)
    billing.save_quotation(
        user=staff, project=p, title="draft", currency="BDT", discount=Decimal(0), items=items
    )
    assert attention(login(alice).get(URL).json())["quotes"] == 1


def test_overdue_amounts_are_split_out_and_money_is_an_exact_string(staff, alice):
    p = project(alice)
    plan = [
        {"label": "Start", "amount": Decimal("400.50"), "due_date": TODAY - timedelta(days=2)},
        {"label": "End", "amount": Decimal("599.50"), "due_date": TODAY + timedelta(days=20)},
    ]
    invoice(staff, p, "1000", plan=plan)
    data = login(alice).get(URL).json()
    assert data["money"]["BDT"] == {"owed": "1000.00", "overdue": "400.50"}
    assert attention(data)["overdue"] == 1


def test_currencies_are_never_mixed(staff, alice):
    p = project(alice)
    invoice(staff, p, "1000")
    ClientProfile.objects.create(user=alice, client_type="foreign")
    invoice(staff, p, "20", currency="USD")
    money = login(alice).get(URL).json()["money"]
    assert money["BDT"]["owed"] == "1000.00" and money["USD"]["owed"] == "20.00"


def test_paid_invoices_drop_out(staff, alice):
    p = project(alice)
    inv = invoice(staff, p, "300")
    billing.record_payment(
        invoice=inv, user=staff, amount=Decimal("300"), method="bank", paid_on=TODAY
    )
    data = login(alice).get(URL).json()
    assert data["stats"]["open_invoices"] == 0 and data["money"] == {}


def test_staff_sees_the_work_waiting_for_them(staff, alice, bob):
    # a package request, an accepted quotation, a draft invoice, an overdue invoice
    svc = Service.objects.create(slug="w", title="Web", summary="x", published=True)
    pkg = Package.objects.create(service=svc, name="Basic", price=Decimal("1"), published=True)
    PackageOrder.objects.create(
        client=alice, package=pkg, title="t", unit_price=1, currency="BDT", cycle="one_time"
    )
    p = project(alice)
    items = [
        {
            "description": "x",
            "quantity": Decimal(1),
            "unit_price": Decimal(100),
            "cycle": "one_time",
        }
    ]
    q = billing.save_quotation(
        user=staff, project=p, title="q", currency="BDT", discount=Decimal(0), items=items
    )
    billing.send_quotation(quotation=q, user=staff)
    billing.decide_quotation(quotation=q, accept=True, user=alice)
    invoice(staff, p, "50", issue=False)
    invoice(
        staff,
        project(bob),
        "70",
        plan=[{"label": "A", "amount": Decimal("70"), "due_date": TODAY - timedelta(days=1)}],
    )
    got = attention(login(staff).get(URL).json())
    assert got["requests"] == 1 and got["accepted"] == 1
    assert got["drafts"] == 1 and got["overdue"] == 1


def test_shop_work_counts_once_and_is_not_in_the_project_numbers(staff, alice):
    from shop.services import create_order

    mug = Product.objects.create(
        slug="mug", title="Mug", kind="physical", price=Decimal("100"), published=True
    )
    StockMovement.objects.create(product=mug, delta=10, reason="restock")
    zone = ShippingZone.objects.create(name="Dhaka", fee=Decimal("10"))
    order = create_order(
        customer=alice,
        items=[{"product": mug, "quantity": 1}],
        zone=zone,
        ship={"name": "A", "phone": "1", "address": "x"},
    )
    client = login(alice).get(URL).json()
    assert attention(client)["shop-pay"] == 1
    assert client["stats"]["open_invoices"] == 0 and client["stats"]["active_projects"] == 0
    assert client["money"] == {}  # the shop invoice is not a "project invoice"

    from shop.services import claim_payment, confirm_payment

    claim_payment(order=order, user=alice, method="bkash", reference="T1")
    assert attention(login(staff).get(URL).json())["pay-check"] == 1
    confirm_payment(order=order, user=staff)
    assert attention(login(staff).get(URL).json())["to-ship"] == 1


def test_subscriptions_due_this_week(staff, alice):
    p = project(alice)
    subs.start_subscription(
        user=staff,
        client=alice,
        project=p,
        title="Hosting",
        unit_price=Decimal("500"),
        currency="BDT",
        cycle="monthly",
        start_date=TODAY + timedelta(days=3),
    )
    data = login(staff).get(URL).json()
    assert data["stats"]["subscriptions"] == 1 and data["stats"]["billing_this_week"] == 1


def test_only_the_owner_sees_the_business_money_this_month(owner, staff, alice):
    p = project(alice)
    inv = invoice(owner, p, "1000")
    billing.record_payment(
        invoice=inv, user=owner, amount=Decimal("400"), method="bank", paid_on=TODAY
    )
    month = login(owner).get(URL).json()["this_month"]["BDT"]
    assert month["received"] == "400.00" and month["spent"] == "0.00"
    assert "this_month" not in login(staff).get(URL).json()
    assert "this_month" not in login(alice).get(URL).json()


def test_owner_without_two_factor_does_not_get_the_money_block(owner, settings):
    settings.REQUIRE_STAFF_MFA = True
    assert "this_month" not in login(owner).get(URL).json()
