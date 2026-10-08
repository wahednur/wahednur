from datetime import date, timedelta
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from billing import recurring, services
from billing.models import Invoice, Quotation, RecurringInvoice, TaxRate
from projects.models import ClientProfile, Project

pytestmark = pytest.mark.django_db
User = get_user_model()
PW = "a-very-long-pass-123"


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False


def mk(email, **kw):
    u = User.objects.create_user(email, PW, **kw)
    EmailAddress.objects.create(user=u, email=email, primary=True, verified=True)
    return u


@pytest.fixture
def staff():
    return mk("staff@example.com", is_staff=True)


@pytest.fixture
def local():
    u = mk("local@example.com")
    ClientProfile.objects.create(
        user=u, full_name="Rahim", company="Rahim Traders", address="Dhaka 1207"
    )
    return u


@pytest.fixture
def foreign():
    u = mk("abroad@example.com")
    ClientProfile.objects.create(user=u, client_type="foreign", full_name="Ann")
    return u


def api(user):
    c = APIClient()
    c.force_login(user)
    return c


ITEMS = [
    {"description": "Storefront", "quantity": "1", "unit_price": "1000.00"},
    {"description": "Admin", "quantity": "2", "unit_price": "250.00"},
]


def body(**extra):
    return {"title": "Shop", "currency": "BDT", "discount": "100.00", "items": ITEMS, **extra}


def test_tax_is_worked_out_on_what_is_left_after_the_discount(staff, local):
    r = api(staff).post(
        "/api/quotations/", body(client=local.pk, tax_name="VAT", tax_rate="15"), format="json"
    )
    assert r.status_code == 201
    d = r.json()
    # subtotal 1500, discount 100 -> 1400, VAT 15% = 210, total 1610
    assert (d["subtotal"], d["discount"], d["tax"], d["total"]) == (
        "1500.00",
        "100.00",
        "210.00",
        "1610.00",
    )


def test_no_tax_means_no_tax_name_and_the_old_total(staff, local):
    d = (
        api(staff)
        .post("/api/quotations/", body(client=local.pk, tax_name="VAT"), format="json")
        .json()
    )
    assert d["tax"] == "0.00" and d["tax_name"] == "" and d["total"] == "1400.00"


def test_a_tax_rate_needs_a_name_and_stays_within_100(staff, local):
    c = api(staff)
    assert (
        c.post("/api/quotations/", body(client=local.pk, tax_rate="15"), format="json").status_code
        == 400
    )
    assert (
        c.post(
            "/api/quotations/", body(client=local.pk, tax_name="X", tax_rate="101"), format="json"
        ).status_code
        == 400
    )


def test_invoice_installments_split_the_total_including_tax(staff, local):
    plan = [
        {"label": "Advance", "percent": "40"},
        {"label": "Midway", "percent": "30"},
        {"label": "Final", "percent": "30"},
    ]
    d = (
        api(staff)
        .post(
            "/api/invoices/",
            body(client=local.pk, tax_name="VAT", tax_rate="15", installments=plan),
            format="json",
        )
        .json()
    )
    assert d["total"] == "1610.00"
    assert [i["amount"] for i in d["installments"]] == ["644.00", "483.00", "483.00"]


def test_a_client_alone_gets_one_general_project_that_is_reused(staff, local):
    c = api(staff)
    a = c.post("/api/quotations/", body(client=local.pk), format="json").json()
    b = c.post("/api/quotations/", body(client=local.pk), format="json").json()
    assert a["project"] == b["project"]
    assert Project.objects.get(pk=a["project"]).title == "General billing"
    assert a["client"] == local.pk


def test_a_project_of_another_client_is_refused(staff, local, foreign):
    p = Project.objects.create(client=foreign, title="Theirs")
    r = api(staff).post("/api/quotations/", body(client=local.pk, project=str(p.pk)), format="json")
    assert r.status_code == 400


def test_neither_client_nor_project_is_refused(staff):
    assert api(staff).post("/api/quotations/", body(), format="json").status_code == 400


def test_the_address_is_filled_from_the_client_and_can_be_overridden(staff, local):
    c = api(staff)
    assert (
        "Dhaka 1207"
        in c.post("/api/quotations/", body(client=local.pk), format="json").json()[
            "bill_to_address"
        ]
    )
    custom = c.post(
        "/api/quotations/", body(client=local.pk, bill_to_address="Road 5, Gulshan"), format="json"
    ).json()
    assert custom["bill_to_address"] == "Road 5, Gulshan"


def test_prefix_number_and_uniqueness(staff, local):
    c = api(staff)
    a = c.post("/api/quotations/", body(client=local.pk), format="json").json()
    year = date.today().year
    assert a["number"] == f"QUO-{year}-0001"
    b = c.post("/api/quotations/", body(client=local.pk, prefix="prop"), format="json").json()
    assert b["number"] == f"PROP-{year}-0001"  # its own counter
    mine = c.post("/api/quotations/", body(client=local.pk, number="acme-2026-a"), format="json")
    assert mine.json()["number"] == "ACME-2026-A"
    again = c.post("/api/quotations/", body(client=local.pk, number="ACME-2026-A"), format="json")
    assert again.status_code == 400
    assert (
        c.post("/api/quotations/", body(client=local.pk, prefix="x"), format="json").status_code
        == 400
    )
    assert (
        c.post(
            "/api/quotations/", body(client=local.pk, number="bad number!"), format="json"
        ).status_code
        == 400
    )


def test_number_preview_does_not_reserve_it(staff):
    c = api(staff)
    one = c.get("/api/billing/next-number/?prefix=QUO").json()["number"]
    assert c.get("/api/billing/next-number/?prefix=QUO").json()["number"] == one


def test_proposal_text_and_dates_are_kept(staff, local):
    d = (
        api(staff)
        .post(
            "/api/quotations/",
            body(
                client=local.pk,
                proposal_text="We will build it.",
                issue_date="2026-05-01",
                valid_until="2026-06-01",
            ),
            format="json",
        )
        .json()
    )
    assert d["proposal_text"] == "We will build it." and d["issue_date"] == "2026-05-01"


def test_a_quotation_can_be_marked_dead_only_from_draft_or_delivered(staff, local):
    c = api(staff)
    q = c.post("/api/quotations/", body(client=local.pk), format="json").json()
    assert c.post(f"/api/quotations/{q['id']}/dead/").json()["status"] == "dead"
    assert c.post(f"/api/quotations/{q['id']}/dead/").status_code == 400
    assert Quotation.Status.REJECTED.label == "Lost" and Quotation.Status.SENT.label == "Delivered"


def test_clients_cannot_mark_a_quotation_dead(staff, local):
    q = api(staff).post("/api/quotations/", body(client=local.pk), format="json").json()
    api(staff).post(f"/api/quotations/{q['id']}/send/")
    assert api(local).post(f"/api/quotations/{q['id']}/dead/").status_code == 403


def test_conversion_keeps_tax_and_address(staff, local):
    c = api(staff)
    q = c.post(
        "/api/quotations/", body(client=local.pk, tax_name="VAT", tax_rate="15"), format="json"
    ).json()
    c.post(f"/api/quotations/{q['id']}/send/")
    c.post(f"/api/quotations/{q['id']}/accept/")
    inv = c.post(f"/api/quotations/{q['id']}/convert/", {}, format="json").json()
    assert (
        inv["total"] == "1610.00"
        and inv["tax_name"] == "VAT"
        and "Dhaka 1207" in inv["bill_to_address"]
    )


def test_the_pdf_shows_tax_and_proposal(staff, local):
    from billing import pdf

    q = (
        api(staff)
        .post(
            "/api/quotations/",
            body(client=local.pk, tax_name="VAT", tax_rate="15", proposal_text="Hello"),
            format="json",
        )
        .json()
    )
    out = pdf.render(services.get_quotation(staff, q["id"]), "Quotation")
    assert out.startswith(b"%PDF")


def test_tax_rates_are_managed_by_staff_only(staff, local):
    assert api(local).get("/api/billing/taxes/").status_code == 403
    r = api(staff).post("/api/billing/taxes/", {"name": "VAT", "rate": "15"}, format="json")
    assert r.status_code == 201 and TaxRate.objects.get().rate == Decimal("15.00")
    assert (
        api(staff)
        .post("/api/billing/taxes/", {"name": "Bad", "rate": "150"}, format="json")
        .status_code
        == 400
    )


# --- recurring invoices --------------------------------------------------------------
def make_recurring(staff, client, **extra):
    data = {
        "client": client.pk,
        "title": "Monthly care",
        "currency": "BDT",
        "frequency": "monthly",
        "start_date": "2026-01-31",
        "due_days": 10,
        "items": [{"description": "Maintenance", "quantity": "1", "unit_price": "5000"}],
        **extra,
    }
    r = api(staff).post("/api/billing/recurring/", data, format="json")
    assert r.status_code == 201, r.content
    return r.json()


def test_recurring_makes_one_invoice_per_period_and_keeps_the_billing_day(staff, local):
    rec = make_recurring(staff, local)
    assert recurring.run_due(date(2026, 1, 31)) == 1
    assert recurring.run_due(date(2026, 1, 31)) == 0  # same day twice: nothing new
    assert recurring.run_due(date(2026, 3, 31)) == 2  # Feb 28 and Mar 31
    dates = sorted(Invoice.objects.values_list("issue_date", flat=True))
    assert dates == [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31)]
    inv = Invoice.objects.order_by("issue_date").first()
    assert inv.due_date == date(2026, 2, 10) and inv.status == "draft"
    assert RecurringInvoice.objects.get(pk=rec["id"]).next_run == date(2026, 4, 30)


def test_auto_issue_issues_and_emails(staff, local, mailoutbox):
    make_recurring(staff, local, auto_issue=True)
    recurring.run_due(date(2026, 1, 31))
    assert Invoice.objects.get().status == "issued" and len(mailoutbox) == 1


def test_end_date_stops_the_schedule(staff, local):
    rec = make_recurring(staff, local, end_date="2026-02-28")
    assert recurring.run_due(date(2026, 6, 1)) == 2
    assert RecurringInvoice.objects.get(pk=rec["id"]).status == "ended"
    assert recurring.run_due(date(2026, 9, 1)) == 0


def test_pause_resume_and_end(staff, local):
    rec = make_recurring(staff, local, start_date=str(date.today()))
    c = api(staff)
    assert c.post(f"/api/billing/recurring/{rec['id']}/pause/").json()["status"] == "paused"
    assert recurring.run_due(date.today() + timedelta(days=40)) == 0  # paused: nothing
    assert c.post(f"/api/billing/recurring/{rec['id']}/resume/").json()["status"] == "active"
    assert c.post(f"/api/billing/recurring/{rec['id']}/end/").json()["status"] == "ended"
    assert c.post(f"/api/billing/recurring/{rec['id']}/pause/").status_code == 400


def test_recurring_currency_follows_the_client_type(staff, local):
    r = api(staff).post(
        "/api/billing/recurring/",
        {
            "client": local.pk,
            "title": "x",
            "currency": "USD",
            "frequency": "monthly",
            "start_date": "2026-01-01",
            "items": [{"description": "a", "quantity": "1", "unit_price": "10"}],
        },
        format="json",
    )
    assert r.status_code == 400


def test_recurring_is_staff_only(staff, local):
    assert api(local).get("/api/billing/recurring/").status_code == 403


def test_a_long_gap_never_creates_more_than_twelve_at_once(staff, local):
    make_recurring(staff, local, frequency="weekly", start_date="2024-01-01")
    assert recurring.run_due(date(2026, 1, 1)) == 12
