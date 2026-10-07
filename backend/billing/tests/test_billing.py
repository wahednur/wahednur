from datetime import date, timedelta
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

from billing.models import Invoice
from projects.models import Project

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
def project(alice):
    return Project.objects.create(client=alice, title="Online shop")


@pytest.fixture
def other_project(bob):
    return Project.objects.create(client=bob, title="Bob's site")


ITEMS = [
    {"description": "Design", "quantity": "1", "unit_price": "20000.00"},
    {"description": "Build", "quantity": "2", "unit_price": "15000.50"},
]  # subtotal 50001.00


def quote(api, project, **extra):
    body = {"project": str(project.pk), "title": "Shop", "items": ITEMS, **extra}
    r = api.post("/api/quotations/", body, format="json")
    assert r.status_code == 201, r.content
    return r.json()


def accepted_quote(staff, alice, project, **extra):
    q = quote(login(staff), project, **extra)
    assert login(staff).post(f"/api/quotations/{q['id']}/send/").status_code == 200
    assert login(alice).post(f"/api/quotations/{q['id']}/accept/").status_code == 200
    return q["id"]


def issued_invoice(staff, project, installments=None, **extra):
    api = login(staff)
    body = {"project": str(project.pk), "title": "Shop", "items": ITEMS, **extra}
    if installments is not None:
        body["installments"] = installments
    r = api.post("/api/invoices/", body, format="json")
    assert r.status_code == 201, r.content
    inv = r.json()
    assert api.post(f"/api/invoices/{inv['id']}/issue/").status_code == 200
    return inv["id"]


def pay(api, inv, amount, **extra):
    body = {"amount": str(amount), "method": "bank", "paid_on": str(date.today()), **extra}
    return api.post(f"/api/invoices/{inv}/payments/", body, format="json")


# --- totals and numbering ---------------------------------------------------------
def test_totals_and_discount_are_computed_on_the_server(staff, project):
    q = quote(login(staff), project, discount="1.00")
    assert Decimal(q["subtotal"]) == Decimal("50001.00")
    assert Decimal(q["total"]) == Decimal("50000.00")
    assert [Decimal(i["amount"]) for i in q["items"]] == [Decimal("20000.00"), Decimal("30001.00")]


@pytest.mark.parametrize(
    "extra",
    [
        {"discount": "999999.00"},
        {"discount": "-1"},
        {"items": []},
        {"items": [{"description": "x", "quantity": "0", "unit_price": "10"}]},
        {"items": [{"description": "x", "quantity": "1", "unit_price": "-5"}]},
    ],
)
def test_bad_money_is_rejected(staff, project, extra):
    body = {"project": str(project.pk), "title": "x", "items": ITEMS, **extra}
    assert login(staff).post("/api/quotations/", body, format="json").status_code == 400


def test_numbers_are_sequential_and_unique(staff, project):
    api = login(staff)
    numbers = [quote(api, project)["number"] for _ in range(3)]
    assert [n.split("-")[-1] for n in numbers] == ["0001", "0002", "0003"]
    assert numbers[0].startswith("QUO-")
    assert issued_invoice(staff, project) and Invoice.objects.get().number.startswith("INV-")


# --- quotation flow ---------------------------------------------------------------
def test_quotation_lifecycle_and_client_visibility(staff, alice, bob, project):
    q = quote(login(staff), project)
    # A draft is invisible to the client.
    assert login(alice).get("/api/quotations/").json() == []
    assert login(alice).get(f"/api/quotations/{q['id']}/").status_code == 404
    login(staff).post(f"/api/quotations/{q['id']}/send/")
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ["alice@example.com"]
    assert len(login(alice).get("/api/quotations/").json()) == 1
    assert login(bob).get(f"/api/quotations/{q['id']}/").status_code == 404  # someone else's
    assert login(bob).post(f"/api/quotations/{q['id']}/accept/").status_code == 404
    r = login(alice).post(f"/api/quotations/{q['id']}/accept/")
    assert r.json()["status"] == "accepted"
    assert login(alice).post(f"/api/quotations/{q['id']}/reject/").status_code == 400


def test_only_drafts_can_be_edited(staff, project):
    api = login(staff)
    q = quote(api, project)
    body = {"title": "New title", "items": ITEMS}
    assert (
        api.put(f"/api/quotations/{q['id']}/", body, format="json").json()["title"] == "New title"
    )
    api.post(f"/api/quotations/{q['id']}/send/")
    assert api.put(f"/api/quotations/{q['id']}/", body, format="json").status_code == 400


def test_an_expired_quotation_cannot_be_accepted(staff, alice, project):
    q = quote(login(staff), project, valid_until=str(date.today() - timedelta(days=1)))
    login(staff).post(f"/api/quotations/{q['id']}/send/")
    assert login(alice).post(f"/api/quotations/{q['id']}/accept/").status_code == 400
    assert login(alice).get(f"/api/quotations/{q['id']}/").json()["status"] == "expired"


def test_clients_cannot_write_money_documents(alice, project):
    api = login(alice)
    body = {"project": str(project.pk), "title": "x", "items": ITEMS}
    assert api.post("/api/quotations/", body, format="json").status_code == 403
    assert api.post("/api/invoices/", body, format="json").status_code == 403
    assert APIClient().get("/api/invoices/").status_code in (401, 403)


def test_staff_without_two_factor_cannot_write(staff, project, settings):
    settings.REQUIRE_STAFF_MFA = True
    body = {"project": str(project.pk), "title": "x", "items": ITEMS}
    assert login(staff).post("/api/quotations/", body, format="json").status_code == 403


# --- quotation -> invoice ---------------------------------------------------------
def test_convert_into_installments_that_add_up(staff, alice, project):
    qid = accepted_quote(staff, alice, project)
    plan = [
        {"label": "Start", "percent": "40"},
        {"label": "Middle", "percent": "30"},
        {"label": "Final", "percent": "30"},
    ]
    r = login(staff).post(f"/api/quotations/{qid}/convert/", {"installments": plan}, format="json")
    assert r.status_code == 201, r.content
    inv = r.json()
    amounts = [Decimal(i["amount"]) for i in inv["installments"]]
    assert amounts == [Decimal("20000.40"), Decimal("15000.30"), Decimal("15000.30")]
    assert sum(amounts) == Decimal(inv["total"])
    assert inv["status"] == "draft" and inv["quotation_id"] == qid
    # Converting twice is refused.
    again = login(staff).post(f"/api/quotations/{qid}/convert/", {}, format="json")
    assert again.status_code == 400


def test_rounding_goes_into_the_last_installment(staff, alice, project):
    qid = accepted_quote(staff, alice, project, discount="0.01")  # total 50000.99
    plan = [{"label": f"P{n}", "percent": "33.33" if n < 2 else "33.34"} for n in range(3)]
    r = login(staff).post(f"/api/quotations/{qid}/convert/", {"installments": plan}, format="json")
    assert sum(Decimal(i["amount"]) for i in r.json()["installments"]) == Decimal("50000.99")


def test_only_accepted_quotations_convert(staff, project):
    q = quote(login(staff), project)
    assert (
        login(staff).post(f"/api/quotations/{q['id']}/convert/", {}, format="json").status_code
        == 400
    )


def test_installments_must_match_the_total(staff, project):
    api = login(staff)
    body = {
        "project": str(project.pk),
        "title": "x",
        "items": ITEMS,
        "installments": [{"label": "A", "amount": "100.00"}, {"label": "B", "amount": "100.00"}],
    }
    assert api.post("/api/invoices/", body, format="json").status_code == 400
    body["installments"] = [{"label": "Only", "amount": "50001.00"}]
    assert api.post("/api/invoices/", body, format="json").status_code == 201


# --- invoices and payments --------------------------------------------------------
def test_default_plan_is_one_full_payment(staff, project):
    inv = (
        login(staff)
        .post(
            "/api/invoices/",
            {"project": str(project.pk), "title": "x", "items": ITEMS},
            format="json",
        )
        .json()
    )
    assert [i["label"] for i in inv["installments"]] == ["Full payment"]
    assert Decimal(inv["installments"][0]["amount"]) == Decimal(inv["total"])


def test_payments_fill_installments_in_order_and_close_the_invoice(staff, alice, project):
    plan = [
        {"label": "Start", "amount": "20000.00"},
        {"label": "Middle", "amount": "20000.00"},
        {"label": "Final", "amount": "10001.00"},
    ]
    inv = issued_invoice(staff, project, plan)
    api = login(staff)

    r = pay(api, inv, "25000").json()
    assert r["state"] == "partial" and Decimal(r["outstanding"]) == Decimal("25001.00")
    assert [i["state"] for i in r["installments"]] == ["paid", "partial", "due"]
    assert Decimal(r["installments"][1]["paid"]) == Decimal("5000.00")

    r = pay(api, inv, "25001").json()
    assert r["state"] == "paid" and Decimal(r["outstanding"]) == 0
    assert [i["state"] for i in r["installments"]] == ["paid", "paid", "paid"]
    # The client sees the same picture.
    mine = login(alice).get(f"/api/invoices/{inv}/").json()
    assert mine["state"] == "paid" and len(mine["payments"]) == 2


def test_overpaying_and_nonsense_amounts_are_refused(staff, project):
    inv = issued_invoice(staff, project)
    api = login(staff)
    assert pay(api, inv, "50001.01").status_code == 400
    assert pay(api, inv, "0").status_code == 400
    assert pay(api, inv, "-5").status_code == 400
    assert pay(api, inv, "50001.00").status_code == 201
    assert pay(api, inv, "1").status_code == 400  # nothing left to pay


def test_an_installment_past_its_date_shows_overdue(staff, project):
    yesterday = str(date.today() - timedelta(days=1))
    inv = issued_invoice(
        staff, project, [{"label": "Start", "amount": "50001.00", "due_date": yesterday}]
    )
    row = login(staff).get(f"/api/invoices/{inv}/").json()["installments"][0]
    assert row["state"] == "overdue"


def test_drafts_are_hidden_and_issued_invoices_are_frozen(staff, alice, project):
    api = login(staff)
    draft = api.post(
        "/api/invoices/", {"project": str(project.pk), "title": "x", "items": ITEMS}, format="json"
    ).json()
    assert login(alice).get("/api/invoices/").json() == []
    assert pay(api, draft["id"], "10").status_code == 400  # not issued yet
    api.post(f"/api/invoices/{draft['id']}/issue/")
    assert len(mail.outbox) == 1
    edit = api.put(f"/api/invoices/{draft['id']}/", {"title": "y", "items": ITEMS}, format="json")
    assert edit.status_code == 400
    assert api.post(f"/api/invoices/{draft['id']}/issue/").status_code == 400


def test_cancelling(staff, project):
    api = login(staff)
    inv = issued_invoice(staff, project)
    pay(api, inv, "10")
    assert api.post(f"/api/invoices/{inv}/cancel/").status_code == 400  # has a payment
    clean = issued_invoice(staff, project)
    assert api.post(f"/api/invoices/{clean}/cancel/").json()["status"] == "cancelled"
    assert pay(api, clean, "10").status_code == 400


def test_clients_cannot_record_payments_or_see_others_invoices(staff, alice, bob, project):
    inv = issued_invoice(staff, project)
    assert pay(login(alice), inv, "10").status_code == 403
    assert login(bob).get(f"/api/invoices/{inv}/").status_code == 404
    assert login(bob).get(f"/api/invoices/{inv}/pdf/").status_code == 404


def test_pdfs_for_owner_and_client_only(staff, alice, bob, project):
    inv = issued_invoice(staff, project, [{"label": "All", "amount": "50001.00"}])
    q = quote(login(staff), project)
    for client in (login(staff), login(alice)):
        r = client.get(f"/api/invoices/{inv}/pdf/")
        assert r.status_code == 200 and r.content.startswith(b"%PDF")
        assert "attachment" in r["Content-Disposition"]
    assert login(staff).get(f"/api/quotations/{q['id']}/pdf/").content.startswith(b"%PDF")
    assert login(alice).get(f"/api/quotations/{q['id']}/pdf/").status_code == 404  # still a draft
    assert APIClient().get(f"/api/invoices/{inv}/pdf/").status_code in (401, 403)


def test_unicode_text_does_not_break_the_pdf(staff, alice, project):
    api = login(staff)
    items = [{"description": "ওয়েবসাইট <b>& more</b>", "quantity": "1", "unit_price": "10"}]
    r = api.post(
        "/api/invoices/",
        {"project": str(project.pk), "title": "x", "items": items},
        format="json",
    )
    assert r.status_code == 201
    assert api.get(f"/api/invoices/{r.json()['id']}/pdf/").status_code == 200


def test_money_is_returned_as_exact_strings(staff, project):
    q = quote(login(staff), project, discount="0.10")
    assert q["total"] == "50000.90" and q["items"][0]["unit_price"] == "20000.00"
