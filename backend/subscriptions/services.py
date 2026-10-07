"""Recurring billing. Each period becomes one issued invoice; running twice never double-bills."""

import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record
from billing import services as billing

from .models import Charge, Subscription

PAYMENT_DAYS = 7  # an invoice is due a week after it is issued
MAX_CATCH_UP = 12  # never create more than a year of invoices in one run


def add_months(d: date, months: int, day: int | None = None) -> date:
    """Next period on the original billing day, clamped to the month end."""
    index = d.month - 1 + months
    year, month = d.year + index // 12, index % 12 + 1
    return date(year, month, min(day or d.day, calendar.monthrange(year, month)[1]))


def advance(d: date, cycle: str, anchor_day: int | None = None) -> date:
    return add_months(d, 12 if cycle == Subscription.Cycle.YEARLY else 1, anchor_day)


def visible_to(user):
    qs = Subscription.objects.select_related("client", "project")
    return qs if user.is_staff else qs.filter(client=user)


def get_visible(user, pk) -> Subscription:
    try:
        return visible_to(user).get(pk=pk)
    except (Subscription.DoesNotExist, ValueError):
        raise NotFound() from None


def start_subscription(*, user, request=None, start_date=None, **data) -> Subscription:
    if data["unit_price"] <= 0:
        raise ValidationError({"unit_price": "The price must be above zero."})
    start = start_date or timezone.localdate()
    sub = Subscription.objects.create(start_date=start, next_billing_date=start, **data)
    record("subscription_started", request=request, user=user)
    return sub


def _bill_one(sub: Subscription, today: date) -> bool:
    """Bill the oldest unbilled period if it is due. Returns True when an invoice was created."""
    with transaction.atomic():
        sub = Subscription.objects.select_for_update().get(pk=sub.pk)
        if sub.status != Subscription.Status.ACTIVE or sub.next_billing_date > today:
            return False
        period = sub.next_billing_date
        if Charge.objects.filter(subscription=sub, period_start=period).exists():
            sub.next_billing_date = advance(period, sub.cycle, sub.start_date.day)
            sub.save(update_fields=["next_billing_date"])
            return True
        invoice = billing.save_invoice(
            user=None,
            project=sub.project,
            title=f"{sub.title} ({period:%d %b %Y})",
            currency=sub.currency,
            discount=Decimal("0"),
            due_date=today + timedelta(days=PAYMENT_DAYS),
            items=[
                {
                    "description": sub.title,
                    "quantity": Decimal(1),
                    "unit_price": sub.unit_price,
                    "cycle": sub.cycle,
                }
            ],
            installments=[
                {
                    "label": "Subscription payment",
                    "percent": Decimal(100),
                    "due_date": today + timedelta(days=PAYMENT_DAYS),
                }
            ],
        )
        billing.issue_invoice(invoice=invoice, user=None)
        Charge.objects.create(subscription=sub, period_start=period, invoice=invoice)
        sub.next_billing_date = advance(period, sub.cycle, sub.start_date.day)
        sub.save(update_fields=["next_billing_date"])
        return True


def bill_due(today: date | None = None) -> int:
    """Create the invoices that are due. Safe to run any number of times a day."""
    today = today or timezone.localdate()
    created = 0
    due = Subscription.objects.filter(
        status=Subscription.Status.ACTIVE, next_billing_date__lte=today
    ).values_list("pk", flat=True)
    for pk in list(due):
        for _ in range(MAX_CATCH_UP):
            if not _bill_one(Subscription(pk=pk), today):
                break
            created += 1
    return created


def pause(*, sub: Subscription, user, request=None) -> Subscription:
    if sub.status != Subscription.Status.ACTIVE:
        raise ValidationError({"detail": "Only an active subscription can be paused."})
    sub.status = Subscription.Status.PAUSED
    sub.save(update_fields=["status"])
    record("subscription_paused", request=request, user=user)
    return sub


def resume(*, sub: Subscription, user, request=None) -> Subscription:
    if sub.status != Subscription.Status.PAUSED:
        raise ValidationError({"detail": "Only a paused subscription can be resumed."})
    sub.status = Subscription.Status.ACTIVE
    # Paused time is not billed afterwards.
    sub.next_billing_date = max(sub.next_billing_date, timezone.localdate())
    sub.save(update_fields=["status", "next_billing_date"])
    record("subscription_resumed", request=request, user=user)
    return sub


def cancel(*, sub: Subscription, user, request=None) -> Subscription:
    if sub.status == Subscription.Status.CANCELLED:
        return sub
    sub.status = Subscription.Status.CANCELLED
    sub.cancelled_at = timezone.now()
    sub.save(update_fields=["status", "cancelled_at"])
    record("subscription_cancelled", request=request, user=user)
    return sub
