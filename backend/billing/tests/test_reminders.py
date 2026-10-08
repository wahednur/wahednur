from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core import mail

from billing import services
from billing.models import Installment, Invoice, Payment
from projects.models import Project

pytestmark = pytest.mark.django_db
TODAY = date(2026, 10, 10)


@pytest.fixture
def client_user():
    return get_user_model().objects.create_user("c@example.com", "a-very-long-pass-123")


def make(client_user, due, *, system=False, amount="100.00"):
    project = Project.objects.create(client=client_user, title="P", is_system=system)
    inv = Invoice.objects.create(
        project=project,
        number=f"INV-{Invoice.objects.count()}",
        title="T",
        status=Invoice.Status.ISSUED,
        currency="USD",
    )
    inv.items.create(description="Work", quantity=1, unit_price=Decimal(amount))
    inst = Installment.objects.create(
        invoice=inv, label="Final", amount=Decimal(amount), due_date=due
    )
    return inv, inst


def test_due_soon_is_sent_once(client_user):
    make(client_user, TODAY + timedelta(days=2))
    assert services.send_reminders(TODAY) == 1
    assert services.send_reminders(TODAY) == 0
    assert "due soon" in mail.outbox[0].subject and "USD 100.00" in mail.outbox[0].body


def test_far_future_is_not_reminded(client_user):
    make(client_user, TODAY + timedelta(days=30))
    assert services.send_reminders(TODAY) == 0


def test_overdue_is_sent_once_and_is_polite(client_user):
    make(client_user, TODAY - timedelta(days=1))
    assert services.send_reminders(TODAY) == 1
    assert services.send_reminders(TODAY + timedelta(days=5)) == 0
    body = mail.outbox[0].body.lower()
    assert "penalty" not in body and "fraud" not in body and "ignore this note" in body


def test_paid_installment_is_skipped(client_user):
    inv, _ = make(client_user, TODAY - timedelta(days=1))
    Payment.objects.create(invoice=inv, amount=Decimal("100.00"), method="bank", paid_on=TODAY)
    assert services.send_reminders(TODAY) == 0


def test_partial_payment_reminds_only_the_balance(client_user):
    inv, _ = make(client_user, TODAY + timedelta(days=1))
    Payment.objects.create(invoice=inv, amount=Decimal("40.00"), method="bank", paid_on=TODAY)
    services.send_reminders(TODAY)
    assert "USD 60.00" in mail.outbox[0].body


def test_shop_and_draft_invoices_are_left_alone(client_user):
    make(client_user, TODAY, system=True)
    inv, _ = make(client_user, TODAY)
    inv.status = Invoice.Status.DRAFT
    inv.save()
    assert services.send_reminders(TODAY) == 0
