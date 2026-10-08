"""Numbers for the home screen. Read-only: it asks the other modules what the signed-in person may
see (the same visibility rules as their own screens) and counts, so it can never show more.
"""

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from accounting import services as accounting
from billing import services as billing
from billing.models import Invoice, Quotation
from catalog import services as catalog
from catalog.models import Order as PackageOrder
from leads.models import Lead
from projects import services as projects
from projects.models import Project
from shop import services as shop
from shop.models import Product
from subscriptions import services as subscriptions
from subscriptions.models import Subscription

ZERO = Decimal("0.00")


def _open_invoices(user):
    """Issued, still-unpaid project invoices the person can see (shop invoices are counted by the
    shop section, so nothing is counted twice)."""
    qs = billing.visible_invoices(user).filter(
        status=Invoice.Status.ISSUED, project__is_system=False
    )
    rows = []
    for inv in qs:
        due = billing.outstanding(inv)
        if due > 0:
            overdue = any(r["state"] == "overdue" for r in billing.schedule(inv))
            rows.append((inv, due, overdue))
    return rows


def _money(rows):
    out: dict = defaultdict(lambda: {"owed": ZERO, "overdue": ZERO})
    for inv, due, overdue in rows:
        out[inv.currency]["owed"] += due
        if overdue:
            out[inv.currency]["overdue"] += sum(
                (
                    r["inst"].amount - r["paid"]
                    for r in billing.schedule(inv)
                    if r["state"] == "overdue"
                ),
                ZERO,
            )
    return dict(out)


def _shop_orders(user):
    live = shop.visible_orders(user).filter(cancelled_at__isnull=True, delivered_at__isnull=True)
    return [(o, shop.status(o)) for o in live.order_by("-created_at")[:300]]


def _item(key, label, count, href):
    return {"key": key, "label": label, "count": count, "href": href}


def _attention(items):
    return [i for i in items if i["count"] > 0]


def _recent_projects(user):
    active = projects.visible_to(user).filter(status=Project.Status.ACTIVE)[:5]
    return [
        {
            "id": p.id,
            "title": p.title,
            "status": p.status,
            "progress": p.progress,
            "due_date": p.due_date,
        }
        for p in active
    ]


def _this_month():
    """Received and spent since the 1st of this month, per currency (owner only)."""
    start = timezone.localdate().replace(day=1)
    data = accounting.summary(start=start)
    return {
        c: {"received": v["received"], "spent": v["spent"], "net": v["net"]}
        for c, v in data.items()
    }


def build(user, *, is_owner: bool) -> dict:
    invoices = _open_invoices(user)
    overdue_count = sum(1 for _, _, o in invoices if o)
    orders = _shop_orders(user)
    count = lambda wanted: sum(1 for _, s in orders if s in wanted)  # noqa: E731
    sent_quotes = billing.visible_quotations(user).filter(status=Quotation.Status.SENT).count()
    subs = subscriptions.visible_to(user).filter(status=Subscription.Status.ACTIVE)

    if not user.is_staff:
        return {
            "role": "client",
            "attention": _attention(
                [
                    _item(
                        "quotes", "Quotations waiting for your answer", sent_quotes, "/app/billing"
                    ),
                    _item("invoices", "Invoices to pay", len(invoices), "/app/billing"),
                    _item("overdue", "Invoices past their due date", overdue_count, "/app/billing"),
                    _item(
                        "shop-pay",
                        "Shop orders waiting for payment",
                        count({"awaiting_payment"}),
                        "/app/shop",
                    ),
                ]
            ),
            "stats": {
                "active_projects": projects.visible_to(user)
                .filter(status=Project.Status.ACTIVE)
                .count(),
                "open_invoices": len(invoices),
                "shop_in_progress": count({"processing", "shipped", "payment_review"}),
                "subscriptions": subs.count(),
            },
            "money": _money(invoices),
            "projects": _recent_projects(user),
        }

    soon = timezone.localdate() + timedelta(days=7)
    accepted_without_invoice = (
        billing.visible_quotations(user)
        .filter(status=Quotation.Status.ACCEPTED, invoice__isnull=True)
        .count()
    )
    draft_invoices = (
        billing.visible_invoices(user)
        .filter(status=Invoice.Status.DRAFT, project__is_system=False)
        .count()
    )
    data = {
        "role": "staff",
        "attention": _attention(
            [
                _item(
                    "pay-check", "Shop payments to check", count({"payment_review"}), "/app/shop"
                ),
                _item(
                    "to-ship",
                    "Paid shop orders to ship",
                    sum(1 for o, s in orders if s == "processing" and shop.has_physical(o)),
                    "/app/shop",
                ),
                _item(
                    "enquiries",
                    "New messages from the contact form",
                    Lead.objects.filter(status=Lead.Status.NEW).count(),
                    "/app/messages",
                ),
                _item(
                    "requests",
                    "New package requests",
                    catalog.visible_orders(user)
                    .filter(status=PackageOrder.Status.REQUESTED)
                    .count(),
                    "/app/orders",
                ),
                _item(
                    "accepted",
                    "Accepted quotations without an invoice",
                    accepted_without_invoice,
                    "/app/billing",
                ),
                _item("overdue", "Invoices past their due date", overdue_count, "/app/billing"),
                _item("drafts", "Draft invoices not yet issued", draft_invoices, "/app/billing"),
            ]
        ),
        "stats": {
            "active_projects": projects.visible_to(user)
            .filter(status=Project.Status.ACTIVE)
            .count(),
            "proposals": projects.visible_to(user).filter(status=Project.Status.PROPOSAL).count(),
            "open_invoices": len(invoices),
            "quotes_out": sent_quotes,
            "subscriptions": subs.count(),
            "billing_this_week": subs.filter(next_billing_date__lte=soon).count(),
            "products_for_sale": Product.objects.filter(published=True).count(),
            "unpaid_shop_orders": count({"awaiting_payment", "payment_review"}),
        },
        "money": _money(invoices),
        "projects": _recent_projects(user),
    }
    if is_owner:
        data["this_month"] = _this_month()
    return data


__all__ = ["build"]
