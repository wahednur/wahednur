"""Load services, packages, products and delivery areas from one JSON file.

    python manage.py load_content content/catalog.json            # preview only: nothing is saved
    python manage.py load_content content/catalog.json --apply    # save

Safe to run again and again: items are matched by their address (services, products), by service and
name (packages) or by name (delivery areas), then created or updated. The same checks as the
management screens apply. A preview runs the whole load and then undoes it, so it shows real errors.
Anything without a price is skipped, so the template can be filled in a little at a time.
See content/catalog.template.json.
"""

import json
import sys

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFError

from catalog.manage import PackageSerializer, ServiceSerializer
from catalog.models import Package, Service
from documents.models import Document
from shop import services as shop
from shop.manage import ProductSerializer, ZoneSerializer
from shop.models import Product, ShippingZone, StockMovement


class Rollback(Exception):
    """Raised at the end of a preview so the database changes are undone."""


def _text(err) -> str:
    detail = getattr(err, "detail", err)
    if isinstance(detail, dict):
        return "; ".join(
            f"{k}: {' '.join(str(x) for x in (v if isinstance(v, list) else [v]))}"
            for k, v in detail.items()
        )
    return str(detail)


def _priced(row) -> bool:
    price = row.get("price", row.get("fee"))
    return price not in (None, "", "TODO")


class Command(BaseCommand):
    help = "Load services, packages, products and delivery areas from a JSON file."

    def add_arguments(self, parser):
        parser.add_argument("path", help="JSON file, or - to read standard input")
        parser.add_argument(
            "--apply", action="store_true", help="save (without it, only a preview)"
        )

    def handle(self, *args, path, apply, **options):
        try:
            raw = sys.stdin.read() if path == "-" else open(path, encoding="utf-8").read()  # noqa: SIM115
            data = json.loads(raw)
        except (OSError, ValueError) as exc:
            raise CommandError(f"Cannot read {path}: {exc}") from exc
        self.log, self.errors = [], []
        try:
            with transaction.atomic():
                self._run(data)
                if self.errors or not apply:
                    raise Rollback
        except Rollback:
            pass
        for line in self.log:
            self.stdout.write(line)
        if self.errors:
            for line in self.errors:
                self.stderr.write(self.style.ERROR(line))
            raise CommandError(f"{len(self.errors)} problem(s). Nothing was saved.")
        verdict = "Saved." if apply else "Preview only, nothing saved. Add --apply to save."
        self.stdout.write(self.style.SUCCESS(verdict))

    # -- helpers -----------------------------------------------------------------------------
    def _save(self, label, serializer_cls, instance, row, **extra):
        ser = serializer_cls(instance, data=row, partial=instance is not None)
        try:
            ser.is_valid(raise_exception=True)
            obj = ser.save(**extra)
        except DRFError as exc:
            self.errors.append(f"{label}: {_text(exc)}")
            return None
        self.log.append(f"{'updated' if instance else 'created'}: {label}")
        return obj

    def _run(self, data):
        for row in data.get("services", []):
            self._service(row)
        for row in data.get("zones", []):
            self._zone(row)
        for row in data.get("products", []):
            self._product(row)

    def _service(self, row):
        row = dict(row)
        packages = row.pop("packages", [])
        label = f"service {row.get('slug')}"
        service = self._save(
            label, ServiceSerializer, Service.objects.filter(slug=row.get("slug")).first(), row
        )
        if service is None:
            return
        for pkg in packages:
            name = pkg.get("name", "?")
            if not _priced(pkg):
                self.log.append(f"skipped (no price yet): package {name} of {service.slug}")
                continue
            existing = Package.objects.filter(service=service, name=name).first()
            extra = {"service": service} if existing is None else {}
            self._save(
                f"package {name} of {service.slug}", PackageSerializer, existing, pkg, **extra
            )

    def _zone(self, row):
        if not _priced(row):
            self.log.append(f"skipped (no fee yet): delivery area {row.get('name')}")
            return
        self._save(
            f"delivery area {row.get('name')}",
            ZoneSerializer,
            ShippingZone.objects.filter(name=row.get("name")).first(),
            row,
        )

    def _product(self, row):
        row = dict(row)
        stock, files = row.pop("stock", None), row.pop("files", [])
        slug = row.get("slug")
        if not _priced(row):
            self.log.append(f"skipped (no price yet): product {slug}")
            return
        existing = Product.objects.filter(slug=slug).first()
        want_published = row.get("published", False)
        if existing is None:
            row["published"] = False  # publish at the end, once files and stock are in place
        product = self._save(f"product {slug}", ProductSerializer, existing, row)
        if product is None:
            return
        for title in files:
            docs = list(Document.objects.filter(title=title, deleted_at__isnull=True)[:2])
            if len(docs) != 1:
                self.errors.append(
                    f"product {slug}: file {title!r} must match exactly one document in the vault"
                )
                continue
            shop.attach_file(product=product, document_id=docs[0].pk)
        if stock and product.kind == Product.Kind.PHYSICAL:
            if StockMovement.objects.filter(product=product).exists():
                self.log.append(
                    f"kept: stock of {slug} already has history, the file's number is ignored"
                )
            else:
                shop.adjust_stock(
                    product=product,
                    delta=int(stock),
                    reason="restock",
                    note="initial stock (load_content)",
                )
        if want_published and not product.published:
            try:
                shop.check_can_publish(product)
            except DRFError as exc:
                self.errors.append(f"product {slug}: {_text(exc)}")
                return
            product.published = True
            product.save(update_fields=["published"])
            self.log.append(f"published: product {slug}")
