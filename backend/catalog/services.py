"""Ordering rules. An order is a request; nothing is billed until staff accept it."""

from datetime import date  # noqa: F401

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record
from billing import services as billing
from billing.models import Cycle
from projects import services as projects
from projects.models import Project
from subscriptions import services as subscriptions

from .models import Order, Package, Service


def published_services():
    return Service.objects.filter(published=True).prefetch_related("packages")


def published_packages():
    return Package.objects.filter(published=True, service__published=True).select_related("service")


def get_service(slug) -> Service:
    try:
        return published_services().get(slug=slug)
    except Service.DoesNotExist:
        raise NotFound() from None


def visible_orders(user):
    qs = Order.objects.select_related("client", "package__service", "project")
    return qs if user.is_staff else qs.filter(client=user)


def get_order(user, pk) -> Order:
    try:
        return visible_orders(user).get(pk=pk)
    except (Order.DoesNotExist, ValueError):
        raise NotFound() from None


def place_order(*, user, package: Package, note="", request=None) -> Order:
    if not (package.published and package.service.published):
        raise NotFound()
    if Order.objects.filter(client=user, package=package, status=Order.Status.REQUESTED).exists():
        raise ValidationError({"detail": "You already have an open request for this package."})
    order = Order.objects.create(
        client=user,
        package=package,
        title=f"{package.service.title} - {package.name}",
        unit_price=package.price,
        currency=package.currency,
        cycle=package.cycle,
        note=note,
    )
    record("order_placed", request=request, user=user)
    send_mail(
        f"New order request: {order.title}",
        f"{user.email} asked for {order.title} "
        f"({order.unit_price} {order.currency}, {order.cycle}).\n\n"
        f"{note}\n\nReview it: {settings.FRONTEND_URL}/app/orders",
        settings.DEFAULT_FROM_EMAIL,
        [settings.BUSINESS_EMAIL],
        fail_silently=True,
    )
    return order


@transaction.atomic
def accept_order(*, order: Order, user, request=None) -> Order:
    """One-time package: project + draft quotation (the usual quote and invoice path).
    Recurring package: project + a running subscription at the listed price."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != Order.Status.REQUESTED:
        raise ValidationError({"detail": "Only a requested order can be accepted."})
    project = projects.create_project(
        user=user,
        request=request,
        client=order.client,
        title=order.title,
        summary=order.note[:3000],
    )
    if order.cycle == Cycle.ONE_TIME:
        billing.save_quotation(
            user=user,
            project=project,
            title=order.title,
            currency=order.currency,
            discount=0,
            items=[
                {
                    "description": order.title,
                    "quantity": 1,
                    "unit_price": order.unit_price,
                    "cycle": Cycle.ONE_TIME,
                }
            ],
        )
    else:
        projects.change_status(project=project, status=Project.Status.ACTIVE, user=user)
        subscriptions.start_subscription(
            user=user,
            request=request,
            client=order.client,
            project=project,
            title=order.title,
            unit_price=order.unit_price,
            currency=order.currency,
            cycle=order.cycle,
            order=order,
        )
    order.status = Order.Status.ACCEPTED
    order.project = project
    order.decided_at = timezone.now()
    order.save(update_fields=["status", "project", "decided_at"])
    record("order_accepted", request=request, user=user)
    return order


def close_order(*, order: Order, status: str, user, request=None) -> Order:
    if order.status != Order.Status.REQUESTED:
        raise ValidationError({"detail": "This order has already been dealt with."})
    order.status = status
    order.decided_at = timezone.now()
    order.save(update_fields=["status", "decided_at"])
    record(f"order_{status}", request=request, user=user)
    return order


# --- staff editing of the price list --------------------------------------------------------
def delete_service(*, service: Service, user, request=None):
    if Order.objects.filter(package__service=service).exists():
        raise ValidationError(
            {"detail": "This service has orders. Hide it (untick Published) instead of deleting."}
        )
    service.delete()
    record("service_deleted", request=request, user=user)


def delete_package(*, package: Package, user, request=None):
    if package.orders.exists():
        raise ValidationError(
            {"detail": "This package has orders. Hide it (untick Published) instead of deleting."}
        )
    package.delete()
    record("package_deleted", request=request, user=user)
