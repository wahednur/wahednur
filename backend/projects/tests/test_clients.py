from datetime import date
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from billing import services as billing
from billing.models import Payment
from projects import services
from projects.models import ClientProfile, Project

pytestmark = pytest.mark.django_db
User = get_user_model()
PW = "a-very-long-pass-123"


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False


@pytest.fixture
def staff():
    u = User.objects.create_user("staff@example.com", PW, is_staff=True)
    EmailAddress.objects.create(user=u, email=u.email, primary=True, verified=True)
    return u


def staff_api(user):
    api = APIClient()
    api.force_login(user)
    return api


def test_staff_creates_a_client_who_chooses_the_password(staff, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        r = staff_api(staff).post(
            "/api/clients/",
            {
                "email": "New@Example.com",
                "client_type": "foreign",
                "full_name": "Ann",
                "company": "Acme",
            },
            format="json",
        )
    assert r.status_code == 201
    assert r.json()["currency"] == "USD" and r.json()["client_type"] == "foreign"
    user = User.objects.get(email="new@example.com")
    assert not user.has_usable_password()  # nobody knows a password yet
    assert EmailAddress.objects.get(user=user).verified
    assert len(mail.outbox) == 1 and "/forgot-password" in mail.outbox[0].body
    assert PW not in mail.outbox[0].body


def test_duplicate_email_is_refused_and_clients_cannot_create_clients(staff):
    User.objects.create_user("dup@example.com", PW)
    api = staff_api(staff)
    body = {"email": "dup@example.com", "client_type": "local"}
    assert api.post("/api/clients/", body, format="json").status_code == 400
    plain = User.objects.create_user("plain@example.com", PW)
    EmailAddress.objects.create(user=plain, email=plain.email, primary=True, verified=True)
    assert staff_api(plain).post("/api/clients/", body, format="json").status_code == 403


def test_invitation_can_be_sent_again(staff):
    c = services.create_client(staff=staff, email="c@example.com", client_type="local")
    mail.outbox.clear()
    assert staff_api(staff).post(f"/api/clients/{c.user_id}/").status_code == 200
    assert len(mail.outbox) == 1


def _doc(staff, project, currency):
    return billing.save_quotation(
        user=staff,
        project=project,
        title="x",
        currency=currency,
        discount=Decimal("0"),
        items=[{"description": "w", "quantity": Decimal(1), "unit_price": Decimal("100")}],
    )


def test_local_client_is_billed_in_taka_and_foreign_in_dollars(staff):
    local = services.create_client(staff=staff, email="l@example.com", client_type="local")
    foreign = services.create_client(staff=staff, email="f@example.com", client_type="foreign")
    pl = Project.objects.create(client=local.user, title="L")
    pf = Project.objects.create(client=foreign.user, title="F")
    _doc(staff, pl, "BDT")
    _doc(staff, pf, "USD")
    with pytest.raises(ValidationError):
        _doc(staff, pl, "USD")
    with pytest.raises(ValidationError):
        _doc(staff, pf, "BDT")


def test_client_without_a_profile_counts_as_local(staff):
    u = User.objects.create_user("np@example.com", PW)
    p = Project.objects.create(client=u, title="P")
    _doc(staff, p, "BDT")
    with pytest.raises(ValidationError):
        _doc(staff, p, "USD")


def test_changing_the_type_changes_the_currency():
    u = User.objects.create_user("t@example.com", PW)
    prof = ClientProfile.objects.create(user=u)
    assert prof.currency == "BDT"
    prof.client_type = "foreign"
    assert prof.currency == "USD"


def _issued_invoice(staff, project):
    inv = billing.save_invoice(
        user=staff,
        project=project,
        title="Build",
        currency="BDT",
        discount=Decimal("0"),
        items=[{"description": "w", "quantity": Decimal(1), "unit_price": Decimal("1000")}],
        installments=[
            {"label": "Advance", "percent": Decimal(40)},
            {"label": "Midway", "percent": Decimal(30)},
            {"label": "Final", "percent": Decimal(30)},
        ],
    )
    billing.issue_invoice(invoice=inv, user=staff)
    return inv


def _pay(inv, amount):
    Payment.objects.create(invoice=inv, amount=Decimal(amount), method="bank", paid_on=date.today())


def test_work_starts_only_after_the_advance_and_delivery_only_after_full_payment(staff):
    client = services.create_client(staff=staff, email="g@example.com", client_type="local")
    project = Project.objects.create(client=client.user, title="G")
    inv = _issued_invoice(staff, project)
    with pytest.raises(ValidationError):
        services.change_status(project=project, status="active")  # advance unpaid
    _pay(inv, "400")  # the 40% advance
    services.change_status(project=project, status="active")
    with pytest.raises(ValidationError):
        services.change_status(project=project, status="completed")  # 600 still due
    _pay(inv, "600")
    services.change_status(project=project, status="completed")


def test_gates_do_not_apply_without_an_invoice_or_when_switched_off(staff, settings):
    client = services.create_client(staff=staff, email="h@example.com", client_type="local")
    p1 = Project.objects.create(client=client.user, title="no invoice")
    services.change_status(project=p1, status="active")
    p2 = Project.objects.create(client=client.user, title="switched off")
    _issued_invoice(staff, p2)
    settings.ENFORCE_PAYMENT_GATES = False
    services.change_status(project=p2, status="active")
