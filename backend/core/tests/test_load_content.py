import json
from decimal import Decimal
from io import StringIO
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError

from catalog.models import Package, Service
from documents import services as documents
from shop.models import Product, ShippingZone, StockMovement

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _vault(settings, tmp_path):
    from documents import storage

    settings.DOCUMENTS_LOCAL_ROOT = tmp_path
    storage.get_storage.cache_clear()


def run(tmp_path, data, apply=False):
    path = tmp_path / "c.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    out, err = StringIO(), StringIO()
    try:
        call_command(
            "load_content", str(path), *(["--apply"] if apply else []), stdout=out, stderr=err
        )
    except CommandError as exc:
        return out.getvalue(), err.getvalue() + str(exc)
    return out.getvalue(), err.getvalue()


SERVICE = {
    "slug": "web",
    "title": "Web",
    "summary": "Sites",
    "published": True,
    "packages": [{"name": "Basic", "price": "15000", "features": ["a", "b"], "published": True}],
}


def test_a_preview_shows_what_would_happen_and_saves_nothing(tmp_path):
    out, _ = run(tmp_path, {"services": [SERVICE]})
    assert "created: service web" in out and "created: package Basic of web" in out
    assert "Preview only" in out
    assert not Service.objects.exists() and not Package.objects.exists()


def test_apply_saves_and_running_again_updates_instead_of_duplicating(tmp_path):
    run(tmp_path, {"services": [SERVICE]}, apply=True)
    assert Package.objects.get().price == Decimal("15000.00")
    changed = json.loads(json.dumps(SERVICE))
    changed["packages"][0]["price"] = "12000"
    out, _ = run(tmp_path, {"services": [changed]}, apply=True)
    assert "updated: package Basic of web" in out
    assert Service.objects.count() == 1 and Package.objects.get().price == Decimal("12000.00")


def test_items_without_a_price_are_skipped_not_invented(tmp_path):
    svc = json.loads(json.dumps(SERVICE))
    svc["packages"].append({"name": "Premium", "price": None})
    data = {
        "services": [svc],
        "zones": [{"name": "Dhaka", "fee": None}],
        "products": [{"slug": "mug", "title": "Mug", "kind": "physical", "price": None}],
    }
    out, _ = run(tmp_path, data, apply=True)
    assert "skipped (no price yet): package Premium" in out
    assert "skipped (no fee yet): delivery area Dhaka" in out
    assert "skipped (no price yet): product mug" in out
    assert (
        Package.objects.count() == 1
        and not ShippingZone.objects.exists()
        and not Product.objects.exists()
    )


def test_a_problem_anywhere_means_nothing_is_saved(tmp_path):
    bad = json.loads(json.dumps(SERVICE))
    bad["packages"][0]["price"] = "-5"
    out, err = run(
        tmp_path,
        {"services": [SERVICE, {**SERVICE, "slug": "app", "packages": bad["packages"]}]},
        apply=True,
    )
    assert "price" in err and "Nothing was saved" in err
    assert not Service.objects.exists()


def test_products_zones_stock_and_publish_in_the_right_order(tmp_path):
    data = {
        "zones": [{"name": "Dhaka", "fee": "60"}],
        "products": [
            {
                "slug": "mug",
                "title": "Mug",
                "kind": "physical",
                "price": "450",
                "stock": 7,
                "published": True,
            }
        ],
    }
    run(tmp_path, data, apply=True)
    mug = Product.objects.get()
    assert mug.published and mug.stock == 7 and ShippingZone.objects.get().fee == Decimal("60.00")
    # stock in the file is only an opening balance: a second run does not add 7 again
    out, _ = run(tmp_path, data, apply=True)
    assert Product.objects.get().stock == 7 and "already has history" in out
    assert StockMovement.objects.count() == 1


def test_a_download_needs_a_vault_file_before_it_goes_live(tmp_path):
    book = {"slug": "book", "title": "Book", "kind": "digital", "price": "300", "published": True}
    _, err = run(tmp_path, {"products": [{**book}]}, apply=True)
    assert "Attach a file" in err and not Product.objects.exists()
    staff = (
        pytest.importorskip("django.contrib.auth")
        .get_user_model()
        .objects.create_user("s@example.com", "a-very-long-pass-123", is_staff=True)
    )
    documents.upload_document(
        user=staff,
        file=SimpleUploadedFile("b.pdf", b"%PDF-1.7 x"),
        title="The Book",
        category="other",
    )
    out, err = run(tmp_path, {"products": [{**book, "files": ["The Book"]}]}, apply=True)
    p = Product.objects.get()
    assert p.published and p.files.count() == 1 and "published: product book" in out
    _, err = run(
        tmp_path, {"products": [{**book, "slug": "b2", "files": ["No such title"]}]}, apply=True
    )
    assert "exactly one document" in err


def test_a_product_type_cannot_be_changed_by_a_reload(tmp_path):
    run(
        tmp_path,
        {"products": [{"slug": "x", "title": "X", "kind": "physical", "price": "5"}]},
        apply=True,
    )
    _, err = run(
        tmp_path,
        {"products": [{"slug": "x", "title": "X", "kind": "digital", "price": "5"}]},
        apply=True,
    )
    assert "cannot be changed" in err and Product.objects.get().kind == "physical"


def test_a_missing_or_broken_file_is_explained(tmp_path):
    with pytest.raises(CommandError, match="Cannot read"):
        call_command("load_content", str(tmp_path / "missing.json"))
    broken = tmp_path / "b.json"
    broken.write_text("{not json", encoding="utf-8")
    with pytest.raises(CommandError, match="Cannot read"):
        call_command("load_content", str(broken))


def test_the_shipped_template_is_valid_and_loads_nothing_until_prices_are_filled(tmp_path):
    template = Path(__file__).resolve().parents[2] / "content" / "catalog.template.json"
    data = json.loads(template.read_text(encoding="utf-8"))
    assert len(data["services"]) == 7
    out, err = run(tmp_path, data, apply=True)
    assert err == "" and Service.objects.count() == 7
    assert not Package.objects.exists() and not Product.objects.exists()
    assert out.count("skipped") >= 9
