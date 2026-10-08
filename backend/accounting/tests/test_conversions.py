import csv
from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
pytestmark = pytest.mark.django_db
TODAY = str(date.today())


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
def api(owner):
    return login(owner)


# 100 USD earned, 10 marketplace fee, 1 withdrawal fee -> 89 sold at 118 = 10,502 BDT,
# then bank 50 + VAT 7.50 + source tax 100 -> 10,344.50 reaches the account. Reference rate 120.
PAYOUT = {
    "settled_on": TODAY, "source": "upwork", "earned_usd": "100", "marketplace_fee_usd": "10",
    "transfer_fee_usd": "1", "reference_rate": "120", "received_bdt": "10344.50",
    "bank_charge_bdt": "50", "vat_bdt": "7.50", "tax_withheld_bdt": "100",
}  # fmt: skip


def payout(api, **extra):
    r = api.post("/api/accounting/settlements/", {**PAYOUT, **extra}, format="json")
    assert r.status_code == 201, r.content
    return r.json()


def test_only_the_owner_can_use_these_screens(api):
    staff = make_user("staff@example.com", is_staff=True)
    for path in ("income", "settlements", "conversions"):
        url = f"/api/accounting/{path}/"
        assert api.get(url).status_code == 200
        assert login(staff).get(url).status_code == 403
        assert APIClient().get(url).status_code in (401, 403)


def test_the_app_works_out_the_rate_you_really_got(api):
    s = payout(api)
    assert s["converted_usd"] == "89.00" and s["before_deductions_bdt"] == "10502.00"
    assert s["effective_rate"] == "118.0000"  # what each sold dollar fetched
    assert s["keep_per_dollar"] == "103.4450"  # what reached you per dollar earned


def test_the_waterfall_adds_up_to_the_cent(api):
    w = payout(api)["waterfall"]
    assert w["value_at_reference_rate"] == "12000.00"
    assert w["marketplace_fee"] == "1200.00" and w["transfer_fee"] == "120.00"
    assert w["rate_difference"] == "178.00"  # 89 x (120 - 118)
    assert (w["bank_charge"], w["vat"], w["tax_withheld"], w["received"]) == (
        "50.00", "7.50", "100.00", "10344.50",
    )  # fmt: skip
    parts = [w[k] for k in ("marketplace_fee", "transfer_fee", "rate_difference", "bank_charge",
                            "vat", "tax_withheld", "other")]  # fmt: skip
    assert Decimal(w["value_at_reference_rate"]) - sum(map(Decimal, parts)) == Decimal(
        w["received"]
    )


def test_a_better_rate_than_the_reference_is_a_negative_loss(api):
    # bank paid 125: 89 x 125 = 11,125; no charges
    w = payout(api, received_bdt="11125", bank_charge_bdt="0", vat_bdt="0", tax_withheld_bdt="0")[
        "waterfall"
    ]
    assert w["rate_difference"] == "-445.00"  # a gain of 445 against the reference


def test_without_a_reference_rate_there_is_no_waterfall_but_the_rest_works(api):
    s = payout(api, reference_rate=None)
    assert s["waterfall"] is None and s["effective_rate"] == "118.0000"


@pytest.mark.parametrize(
    "bad",
    [
        {"marketplace_fee_usd": "99", "transfer_fee_usd": "1"},  # nothing left to sell
        {"marketplace_fee_usd": "-1"},
        {"bank_charge_bdt": "-5"},
        {"earned_usd": "0"},
        {"received_bdt": "0"},
        {"reference_rate": "0"},
    ],
)
def test_nonsense_payouts_are_refused(api, bad):
    assert (
        api.post("/api/accounting/settlements/", {**PAYOUT, **bad}, format="json").status_code
        == 400
    )


def test_external_income_counts_once_and_a_payout_adds_only_costs(api):
    r = api.post(
        "/api/accounting/income/",
        {
            "earned_on": TODAY,
            "source": "upwork",
            "description": "Shop site",
            "amount": "100",
            "currency": "USD",
        },
        format="json",
    )
    assert r.status_code == 201
    payout(api)
    data = api.get("/api/accounting/summary/").json()
    usd, bdt = data["USD"], data["BDT"]
    assert usd["received"] == "100.00"  # the income, counted once
    assert usd["spent"] == "11.00" and usd["net"] == "89.00"  # marketplace + withdrawal fee
    assert bdt["received"] == "0.00" and bdt["spent"] == "57.50"  # bank charge + VAT
    assert bdt["tax_withheld"] == "100.00"
    assert bdt["net_after_tax_withheld"] == "-157.50"  # BDT here is only the costs side


def test_income_must_be_positive_and_can_be_removed(api):
    assert (
        api.post(
            "/api/accounting/income/",
            {"earned_on": TODAY, "amount": "0", "currency": "USD"},
            format="json",
        ).status_code
        == 400
    )
    iid = api.post(
        "/api/accounting/income/",
        {"earned_on": TODAY, "amount": "5", "currency": "USD"},
        format="json",
    ).json()["id"]
    assert api.delete(f"/api/accounting/income/{iid}/").status_code == 204
    assert api.get("/api/accounting/income/").json() == []
    assert api.get("/api/accounting/summary/").json() == {}


def test_edit_and_delete_a_payout(api):
    sid = payout(api)["id"]
    r = api.put(
        f"/api/accounting/settlements/{sid}/", {**PAYOUT, "received_bdt": "10000"}, format="json"
    )
    assert r.status_code == 200 and r.json()["received_bdt"] == "10000.00"
    assert api.delete(f"/api/accounting/settlements/{sid}/").status_code == 204
    assert api.get("/api/accounting/conversions/").json() == {}
    assert api.delete(f"/api/accounting/settlements/{sid}/").status_code == 404


def test_the_conversion_report_totals_and_the_weighted_rate(api):
    payout(api)  # 89 sold at 118
    # 50 earned, 5 + 0.5 fees -> 44.5 sold at 120 = 5,340; bank 30; reference 119
    payout(
        api,
        earned_usd="50",
        marketplace_fee_usd="5",
        transfer_fee_usd="0.5",
        received_bdt="5310",
        bank_charge_bdt="30",
        vat_bdt="0",
        tax_withheld_bdt="0",
        reference_rate="119",
    )
    r = api.get("/api/accounting/conversions/").json()["USD"]
    assert r["count"] == 2 and r["earned"] == "150.00" and r["converted"] == "133.50"
    assert r["marketplace_fees"] == "15.00" and r["transfer_fees"] == "1.50"
    assert r["received_bdt"] == "15654.50" and r["tax_withheld"] == "100.00"
    assert (
        r["average_rate"] == "118.6667"
    )  # (10502 + 5340) / 133.5, weighted, not an average of two rates
    assert r["keep_per_dollar"] == "104.3633"
    w = r["waterfall"]
    assert r["waterfall_covers"] == 2 and w["value_at_reference_rate"] == "17950.00"
    total_costs = sum(Decimal(w[k]) for k in ("marketplace_fee", "transfer_fee", "rate_difference",
                                              "bank_charge", "vat", "tax_withheld", "other"))  # fmt: skip
    assert Decimal(w["value_at_reference_rate"]) - total_costs == Decimal(w["received"])


def test_payouts_without_a_reference_rate_are_left_out_of_the_waterfall_only(api):
    payout(api)
    payout(api, reference_rate=None)
    r = api.get("/api/accounting/conversions/").json()["USD"]
    assert r["count"] == 2 and r["waterfall_covers"] == 1 and r["earned"] == "200.00"


def test_date_filter(api):
    payout(api, settled_on="2026-01-15")
    payout(api, settled_on="2026-03-15")
    assert api.get("/api/accounting/conversions/?from=2026-03-01").json()["USD"]["count"] == 1
    assert api.get("/api/accounting/conversions/?from=2027-01-01").json() == {}


def test_the_ledger_shows_every_leg_and_the_taka_legs_add_up_to_what_arrived(api):
    api.post(
        "/api/accounting/income/",
        {"earned_on": TODAY, "source": "fiverr", "amount": "100", "currency": "USD"},
        format="json",
    )
    payout(api)
    text = api.get("/api/accounting/export/").content.decode()
    rows = list(csv.DictReader(StringIO(text)))
    kinds = {r["type"] for r in rows}
    assert {"income", "expense", "conversion", "tax withheld"} <= kinds
    bdt = sum(Decimal(r["amount"]) for r in rows if r["currency"] == "BDT")
    usd = sum(Decimal(r["amount"]) for r in rows if r["currency"] == "USD")
    assert bdt == Decimal("10344.50")  # exactly what reached the account
    assert usd == Decimal("0.00")  # 100 earned - 10 - 1 fees - 89 sold: every dollar accounted for


def test_owner_without_two_factor_is_locked_out(api, settings):
    settings.REQUIRE_STAFF_MFA = True
    assert api.get("/api/accounting/settlements/").status_code == 403
