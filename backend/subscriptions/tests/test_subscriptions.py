from datetime import date, timedelta
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from billing import services as billing
from billing.models import Invoice
from projects.models import Project
from subscriptions import services
from subscriptions.models import Charge, Subscription
from subscriptions.tasks import bill_due_subscriptions

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "a-very-long-pass-123"
D = date(2026, 1, 31)


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
def sub(staff, alice):
    project = Project.objects.create(client=alice, title="Hosting")
    return services.start_subscription(
        user=staff,
        client=alice,
        project=project,
        title="Hosting plan",
        unit_price=Decimal("500.00"),
        currency="BDT",
        cycle="monthly",
        start_date=D,
    )


def test_add_months_clamps_to_month_end():
    assert services.add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert services.add_months(date(2028, 1, 31), 1) == date(2028, 2, 29)
    assert services.add_months(date(2026, 12, 15), 1) == date(2027, 1, 15)
    assert services.advance(date(2026, 3, 1), "yearly") == date(2027, 3, 1)
    # The billing day is not lost after a short month: 31 Jan, 28 Feb, back to 31 Mar.
    assert services.advance(date(2026, 2, 28), "monthly", anchor_day=31) == date(2026, 3, 31)


def test_a_due_subscription_gets_an_issued_invoice_and_the_date_moves(sub):
    assert services.bill_due(today=D) == 1
    inv = Invoice.objects.get()
    assert inv.status == "issued" and billing.total(inv) == Decimal("500.00")
    assert inv.items.get().cycle == "monthly" and inv.due_date == D + timedelta(days=7)
    assert inv.created_by is None
    sub.refresh_from_db()
    assert sub.next_billing_date == date(2026, 2, 28)
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ["alice@example.com"]


def test_running_twice_the_same_day_does_not_double_bill(sub):
    services.bill_due(today=D)
    assert services.bill_due(today=D) == 0
    assert Invoice.objects.count() == 1 and Charge.objects.count() == 1


def test_a_period_that_already_has_a_charge_is_never_billed_again(sub):
    services.bill_due(today=D)
    Subscription.objects.filter(pk=sub.pk).update(next_billing_date=D)  # simulate a crash replay
    services.bill_due(today=D)
    assert Invoice.objects.count() == 1
    sub.refresh_from_db()
    assert sub.next_billing_date == date(2026, 2, 28)


def test_nothing_is_billed_before_the_date(sub):
    assert services.bill_due(today=D - timedelta(days=1)) == 0
    assert not Invoice.objects.exists()


def test_missed_periods_are_caught_up_one_invoice_each(sub):
    assert services.bill_due(today=date(2026, 4, 30)) == 4  # Jan31, Feb28, Mar31, Apr30
    assert Invoice.objects.count() == 4


def test_paused_and_cancelled_are_not_billed_and_resume_does_not_back_bill(sub, staff):
    services.pause(sub=sub, user=staff)
    assert services.bill_due(today=date(2026, 6, 1)) == 0
    services.resume(sub=sub, user=staff)
    sub.refresh_from_db()
    assert sub.next_billing_date >= date.today()  # months in the pause are not charged
    services.cancel(sub=sub, user=staff)
    assert services.bill_due(today=date(2099, 1, 1)) == 0


def test_yearly_cycle(staff, alice):
    project = Project.objects.create(client=alice, title="Domain")
    s = services.start_subscription(
        user=staff,
        client=alice,
        project=project,
        title="Domain",
        unit_price=Decimal("1200"),
        currency="BDT",
        cycle="yearly",
        start_date=date(2026, 5, 1),
    )
    services.bill_due(today=date(2026, 5, 1))
    s.refresh_from_db()
    assert s.next_billing_date == date(2027, 5, 1)


def test_price_must_be_positive(staff, alice):
    project = Project.objects.create(client=alice, title="x")
    from rest_framework.exceptions import ValidationError

    with pytest.raises(ValidationError):
        services.start_subscription(
            user=staff,
            client=alice,
            project=project,
            title="x",
            unit_price=Decimal("0"),
            currency="BDT",
            cycle="monthly",
        )


def test_celery_task_runs_the_billing(sub, monkeypatch):
    monkeypatch.setattr(services, "bill_due", lambda: 7)
    assert bill_due_subscriptions() == 7


# --- API ----------------------------------------------------------------------------
def test_client_sees_and_cancels_only_their_own(sub, alice, staff):
    bob = make_user("bob@example.com")
    assert [s["id"] for s in login(alice).get("/api/subscriptions/").json()] == [sub.pk]
    assert login(bob).get("/api/subscriptions/").json() == []
    assert login(bob).post(f"/api/subscriptions/{sub.pk}/cancel/").status_code == 404
    # A client cannot pause or resume; only staff can.
    assert login(alice).post(f"/api/subscriptions/{sub.pk}/pause/").status_code == 403
    assert login(staff).post(f"/api/subscriptions/{sub.pk}/pause/").json()["status"] == "paused"
    assert login(alice).post(f"/api/subscriptions/{sub.pk}/cancel/").json()["status"] == "cancelled"
    assert APIClient().get("/api/subscriptions/").status_code in (401, 403)


def test_subscription_json_uses_exact_money_strings(sub, alice):
    data = login(alice).get("/api/subscriptions/").json()[0]
    assert data["unit_price"] == "500.00" and data["next_billing_date"] == "2026-01-31"
