from datetime import date, timedelta
from decimal import Decimal

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounting.models import Expense
from billing import services as billing
from billing.models import Invoice, Payment
from projects.models import ClientProfile, Project

User = get_user_model()
pytestmark = pytest.mark.django_db
PW = "a-very-long-pass-123"
TODAY = date.today()


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
def owner():
    return make_user("owner@example.com", is_staff=True, is_superuser=True)


@pytest.fixture
def staff():
    return make_user("staff@example.com", is_staff=True)


@pytest.fixture
def client_user():
    return make_user("client@example.com")


@pytest.fixture
def project(client_user):
    return Project.objects.create(client=client_user, title="Shop")


def invoice(owner, project, amount, currency="BDT", plan=None, paid=None):
    inv = billing.save_invoice(
        user=owner,
        project=project,
        title="x",
        currency=currency,
        discount=Decimal("0"),
        items=[
            {
                "description": "Work",
                "quantity": Decimal(1),
                "unit_price": Decimal(amount),
                "cycle": "one_time",
            }
        ],
        installments=plan or [],
    )
    billing.issue_invoice(invoice=inv, user=owner)
    for value, when in paid or []:
        billing.record_payment(
            invoice=inv, user=owner, amount=Decimal(value), method="bank", paid_on=when
        )
    return inv


def spend(owner, amount, **extra):
    body = {"spent_on": str(TODAY), "category": "hosting", "amount": amount, **extra}
    return login(owner).post("/api/accounting/expenses/", body, format="json")


# --- access: only the owner -------------------------------------------------------
@pytest.mark.parametrize(
    "path",
    [
        "/api/accounting/expenses/",
        "/api/accounting/summary/",
        "/api/accounting/projects/",
        "/api/accounting/export/",
    ],
)
def test_only_the_owner_can_open_the_books(path, owner, staff, client_user):
    assert login(owner).get(path).status_code == 200
    assert login(staff).get(path).status_code == 403  # staff is not the owner
    assert login(client_user).get(path).status_code == 403
    assert APIClient().get(path).status_code in (401, 403)


def test_owner_without_two_factor_is_locked_out(owner, settings):
    settings.REQUIRE_STAFF_MFA = True
    assert login(owner).get("/api/accounting/summary/").status_code == 403


# --- expenses ---------------------------------------------------------------------
def test_expense_crud_and_soft_delete(owner):
    r = spend(owner, "1500.50", vendor="Hetzner")
    assert r.status_code == 201 and r.json()["amount"] == "1500.50"
    eid = r.json()["id"]
    api = login(owner)
    body = {"spent_on": str(TODAY), "category": "domain", "amount": "900", "currency": "BDT"}
    assert (
        api.put(f"/api/accounting/expenses/{eid}/", body, format="json").json()["category"]
        == "domain"
    )
    assert api.delete(f"/api/accounting/expenses/{eid}/").status_code == 204
    assert api.get("/api/accounting/expenses/").json() == []
    assert Expense.objects.count() == 1  # kept for the record
    assert api.delete(f"/api/accounting/expenses/{eid}/").status_code == 404


@pytest.mark.parametrize("amount", ["0", "-5"])
def test_expense_amount_must_be_positive(owner, amount):
    assert spend(owner, amount).status_code == 400


def test_expense_filters(owner):
    spend(owner, "100", spent_on=str(TODAY - timedelta(days=60)))
    spend(owner, "200", category="domain")
    api = login(owner)
    assert len(api.get(f"/api/accounting/expenses/?from={TODAY - timedelta(days=30)}").json()) == 1
    assert len(api.get("/api/accounting/expenses/?category=domain").json()) == 1
    assert api.get("/api/accounting/expenses/?from=junk").status_code == 400


# --- reports ----------------------------------------------------------------------
def test_summary_is_per_currency_and_never_mixes_them(owner, project):
    invoice(owner, project, "50000", paid=[("20000", TODAY)])
    abroad = get_user_model().objects.create_user("abroad@example.com", "a-very-long-pass-123")
    ClientProfile.objects.create(user=abroad, client_type="foreign")
    foreign = Project.objects.create(client=abroad, title="Abroad")
    invoice(owner, foreign, "300", currency="USD", paid=[("300", TODAY)])
    spend(owner, "5000")
    spend(owner, "40", currency="USD")
    data = login(owner).get("/api/accounting/summary/").json()
    assert data["BDT"]["received"] == "20000.00" and data["BDT"]["spent"] == "5000.00"
    assert data["BDT"]["net"] == "15000.00" and data["BDT"]["receivable"] == "30000.00"
    assert data["USD"]["received"] == "300.00" and data["USD"]["net"] == "260.00"
    assert data["USD"]["receivable"] == "0.00"


def test_receivable_and_overdue(owner, project):
    yesterday = TODAY - timedelta(days=1)
    plan = [
        {"label": "Start", "amount": Decimal("1000"), "due_date": yesterday},
        {"label": "Final", "amount": Decimal("1000"), "due_date": TODAY + timedelta(days=30)},
    ]
    invoice(owner, project, "2000", plan=plan)
    data = login(owner).get("/api/accounting/summary/").json()["BDT"]
    assert data["receivable"] == "2000.00" and data["overdue"] == "1000.00"


def test_cancelled_and_draft_invoices_do_not_count(owner, project):
    inv = invoice(owner, project, "1000")
    billing.cancel_invoice(invoice=inv, user=owner)
    billing.save_invoice(
        user=owner,
        project=project,
        title="d",
        currency="BDT",
        discount=Decimal("0"),
        items=[
            {
                "description": "x",
                "quantity": Decimal(1),
                "unit_price": Decimal(500),
                "cycle": "one_time",
            }
        ],
        installments=[],
    )
    assert login(owner).get("/api/accounting/summary/").json() == {}


def test_date_range_and_monthly_breakdown(owner, project):
    old = TODAY - timedelta(days=90)
    invoice(owner, project, "1000", paid=[("400", old), ("100", TODAY)])
    spend(owner, "50", spent_on=str(old))
    api = login(owner)
    everything = api.get("/api/accounting/summary/").json()["BDT"]
    assert everything["received"] == "500.00" and len(everything["months"]) == 2
    recent = api.get(f"/api/accounting/summary/?from={TODAY - timedelta(days=30)}").json()["BDT"]
    assert recent["received"] == "100.00" and recent["spent"] == "0.00"
    first = everything["months"][0]
    assert first["received"] == "400.00" and first["spent"] == "50.00" and first["net"] == "350.00"


def test_project_profitability(owner, project, client_user):
    other = Project.objects.create(client=client_user, title="Blog")
    invoice(owner, project, "10000", paid=[("4000", TODAY)])
    spend(owner, "1000", project=project.pk)
    spend(owner, "700")  # general expense, no project
    rows = {r["title"]: r for r in login(owner).get("/api/accounting/projects/").json()}
    assert rows["Shop"]["invoiced"] == "10000.00" and rows["Shop"]["received"] == "4000.00"
    assert rows["Shop"]["spent"] == "1000.00" and rows["Shop"]["net"] == "3000.00"
    assert "Blog" not in rows and other.pk


def test_report_matches_the_payment_table(owner, project):
    inv = invoice(owner, project, "900", paid=[("100", TODAY), ("250.25", TODAY)])
    total = sum(p.amount for p in Payment.objects.filter(invoice=inv))
    got = login(owner).get("/api/accounting/summary/").json()["BDT"]["received"]
    assert Decimal(got) == total and Invoice.objects.count() == 1


# --- export -----------------------------------------------------------------------
def test_csv_export_lists_money_in_and_out(owner, project):
    invoice(owner, project, "1000", paid=[("400", TODAY)])
    spend(owner, "50", vendor="Hetzner")
    r = login(owner).get("/api/accounting/export/")
    assert r["Content-Type"].startswith("text/csv") and "attachment" in r["Content-Disposition"]
    lines = r.content.decode().strip().splitlines()
    assert lines[0].startswith("date,type,reference") and len(lines) == 3
    assert any(",income," in x and x.endswith("400.00") for x in lines)
    assert any(",expense," in x and x.endswith("-50.00") for x in lines)


def test_csv_cannot_be_used_for_formula_injection(owner):
    spend(owner, "10", vendor='=HYPERLINK("http://evil","click")', description="+cmd|' /C calc'!A0")
    text = login(owner).get("/api/accounting/export/").content.decode()
    assert "'=HYPERLINK" in text and "'+cmd" in text
    assert ",=HYPERLINK" not in text and ',"=HYPERLINK' not in text
