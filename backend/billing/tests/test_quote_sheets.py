from decimal import Decimal
from io import StringIO
from pathlib import Path

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from billing import pdf, services
from billing.models import Quotation
from projects.models import ClientProfile

pytestmark = pytest.mark.django_db
User = get_user_model()
PW = "a-very-long-pass-123"
TEMPLATE = Path(__file__).resolve().parents[2] / "content" / "quotes" / "emis.template.json"


@pytest.fixture(autouse=True)
def _settings(settings):
    settings.REQUIRE_STAFF_MFA = False


def mk(email, **kw):
    u = User.objects.create_user(email, PW, **kw)
    EmailAddress.objects.create(user=u, email=email, primary=True, verified=True)
    return u


@pytest.fixture
def staff():
    return mk("staff@example.com", is_staff=True, is_superuser=True)


@pytest.fixture
def client_user():
    u = mk("inst@example.com")
    ClientProfile.objects.create(user=u, company="An Institute", address="Sherpur")
    return u


def api(u):
    c = APIClient()
    c.force_login(u)
    return c


def sheet(**extra):
    return {"description": "Sheet", "quantity": "1", "unit_price": "1000.00", **extra}


def body(client, items, **extra):
    return {
        "client": client.pk,
        "title": "Scope",
        "currency": "BDT",
        "discount": "0",
        "items": items,
        **extra,
    }


def test_a_sheet_keeps_its_details_and_a_price_range(staff, client_user):
    r = api(staff).post(
        "/api/quotations/",
        body(
            client_user,
            [
                sheet(
                    details="a\nb",
                    time_estimate="7-10 days",
                    risk="high",
                    work_state="new",
                    note="because",
                    unit_price_max="1500.00",
                )
            ],
        ),
        format="json",
    )
    assert r.status_code == 201, r.content
    d = r.json()
    item = d["items"][0]
    assert (
        item["details"] == "a\nb" and item["risk"] == "high" and item["unit_price_max"] == "1500.00"
    )
    assert d["total"] == "1000.00" and d["subtotal_max"] == "1500.00"  # only the price is billed


def test_a_range_whose_top_is_below_the_price_is_refused(staff, client_user):
    r = api(staff).post(
        "/api/quotations/", body(client_user, [sheet(unit_price_max="500.00")]), format="json"
    )
    assert r.status_code == 400


def test_an_item_that_is_not_counted_is_shown_but_not_billed(staff, client_user):
    d = (
        api(staff)
        .post(
            "/api/quotations/",
            body(
                client_user,
                [sheet(), sheet(description="Free proof", unit_price="999", counted=False)],
            ),
            format="json",
        )
        .json()
    )
    assert d["subtotal"] == "1000.00" and d["total"] == "1000.00"
    assert [i["counted"] for i in d["items"]] == [True, False]


def test_all_items_uncounted_means_nothing_to_bill(staff, client_user):
    r = api(staff).post(
        "/api/quotations/", body(client_user, [sheet(counted=False)]), format="json"
    )
    assert r.status_code == 400


def test_sections_risks_and_payment_plan_are_stored(staff, client_user):
    d = (
        api(staff)
        .post(
            "/api/quotations/",
            body(
                client_user,
                [sheet()],
                subtitle="A subtitle",
                revision="Rev A",
                sections=[{"heading": "Why", "body": "Because"}],
                risks=[{"risk": "No tests", "impact": "Bugs"}],
                payment_plan=[
                    {"label": "Advance", "percent": "40"},
                    {"label": "Mid", "percent": "30"},
                    {"label": "Final", "percent": "30"},
                ],
            ),
            format="json",
        )
        .json()
    )
    assert d["subtitle"] == "A subtitle" and d["revision"] == "Rev A"
    assert d["sections"][0]["heading"] == "Why" and d["risks"][0]["risk"] == "No tests"
    assert [Decimal(p["percent"]) for p in d["payment_plan"]] == [40, 30, 30]


def test_a_payment_plan_must_add_up_to_100(staff, client_user):
    r = api(staff).post(
        "/api/quotations/",
        body(client_user, [sheet()], payment_plan=[{"label": "A", "percent": "40"}]),
        format="json",
    )
    assert r.status_code == 400


def test_conversion_uses_the_quotes_payment_plan_and_keeps_the_sheets(staff, client_user):
    c = api(staff)
    q = c.post(
        "/api/quotations/",
        body(
            client_user,
            [sheet(details="x", unit_price_max="2000.00")],
            payment_plan=[
                {"label": "Advance", "percent": "40"},
                {"label": "Mid", "percent": "30"},
                {"label": "Final", "percent": "30"},
            ],
        ),
        format="json",
    ).json()
    c.post(f"/api/quotations/{q['id']}/send/")
    c.post(f"/api/quotations/{q['id']}/accept/")
    inv = c.post(f"/api/quotations/{q['id']}/convert/", {}, format="json").json()
    assert [i["amount"] for i in inv["installments"]] == ["400.00", "300.00", "300.00"]
    assert inv["items"][0]["details"] == "x" and inv["items"][0]["unit_price_max"] is None


def test_the_pdf_renders_a_full_proposal(staff, client_user):
    q = (
        api(staff)
        .post(
            "/api/quotations/",
            body(
                client_user,
                [
                    sheet(
                        details="point one",
                        time_estimate="3 days",
                        risk="mid",
                        work_state="partial",
                        note="n",
                        unit_price_max="1200",
                    )
                ],
                sections=[{"heading": "Why", "body": "Because"}],
                risks=[{"risk": "R", "impact": "I"}],
                payment_plan=[{"label": "All", "percent": "100"}],
                proposal_text="Hello",
            ),
            format="json",
        )
        .json()
    )
    out = pdf.render(services.get_quotation(staff, q["id"]), "Quotation")
    assert out.startswith(b"%PDF") and len(out) > 2000


def test_the_emis_template_loads_and_totals_match_the_document(staff, client_user):
    out = StringIO()
    call_command("load_quote", str(TEMPLATE), client=client_user.email, stdout=out)
    assert "Preview only" in out.getvalue() and Quotation.objects.count() == 0
    out = StringIO()
    call_command("load_quote", str(TEMPLATE), client=client_user.email, apply=True, stdout=out)
    q = Quotation.objects.get()
    assert q.status == "draft" and q.items.count() == 12
    assert services.total(q) == Decimal("307000.00") and services.subtotal_max(q) == Decimal(
        "443000.00"
    )
    assert [Decimal(p["percent"]) for p in q.payment_plan] == [40, 30, 30]
    assert q.items.filter(counted=False).count() == 1 and "An Institute" in q.bill_to_address
    assert not any("Sherpur Polytechnic" in str(v) for v in [q.title, q.subtitle, q.proposal_text])


def test_the_template_refuses_a_missing_client(staff):
    from django.core.management.base import CommandError

    with pytest.raises(CommandError):
        call_command("load_quote", str(TEMPLATE), client="nobody@example.com")
