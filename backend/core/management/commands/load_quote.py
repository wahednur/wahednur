"""Create a draft quotation from a JSON file, for a client that already exists.

    python manage.py load_quote content/quotes/emis.template.json --client a@b.com
    python manage.py load_quote content/quotes/emis.template.json --client a@b.com --apply

Without --apply it checks everything and saves nothing. The result is a normal DRAFT quotation: open
it in the admin, change what you want, then deliver it. The client's company and address come from
the client's profile, and the currency must match the client's type (local BDT, foreign USD).
"""

import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from billing import serializers as s
from billing import services


class Rollback(Exception):
    pass


class Command(BaseCommand):
    help = "Create a draft quotation from a JSON file (preview by default)."

    def add_arguments(self, parser):
        parser.add_argument("file")
        parser.add_argument("--client", required=True, help="the client's email")
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, file, client, apply, **opts):
        User = get_user_model()
        try:
            raw = json.loads(Path(file).read_text(encoding="utf-8"))
        except (OSError, ValueError) as err:
            raise CommandError(f"Could not read {file}: {err}") from err
        raw.pop("_how_to_use", None)
        owner = User.objects.filter(is_superuser=True).order_by("pk").first()
        customer = User.objects.filter(email__iexact=client, is_staff=False).first()
        if owner is None:
            raise CommandError("Create the owner account first (bootstrap_owner).")
        if customer is None:
            raise CommandError(
                f"No client with the email {client}. Create the client in the admin first."
            )
        data = s.QuotationIn(data=raw)
        if not data.is_valid():
            raise CommandError(f"The file has a problem: {data.errors}")
        d = dict(data.validated_data)
        items = d.pop("items")
        try:
            with transaction.atomic():
                project = services.project_for(client=customer)
                q = services.save_quotation(user=owner, items=items, project=project, **d)
                self.stdout.write(
                    f"{q.number}: {q.title}\n  client {customer.email}, {q.currency}, "
                    f"{len(items)} items, total {services.total(q)}"
                    + (
                        f" (estimate up to {services.subtotal_max(q)})"
                        if services.subtotal_max(q)
                        else ""
                    )
                )
                if not apply:
                    raise Rollback
        except Rollback:
            self.stdout.write("Preview only. Nothing saved. Add --apply to create the draft.")
            return
        except ValidationError as err:
            raise CommandError(f"Not saved: {err.detail}") from err
        self.stdout.write(
            self.style.SUCCESS("Draft created. Open it in the admin (Billing → Quotes).")
        )
