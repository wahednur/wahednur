"""Shop rules: stock, orders, manual payment, shipping, downloads.

An order's money is a normal billing invoice, so payments, PDFs and the accounting reports work
unchanged. Stock is a ledger of movements. Order status is derived from the facts (invoice paid?
shipped?), never stored, so it cannot disagree with them.
"""

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.signals import record
from billing import services as billing
from billing.models import Cycle
from documents import models as documents_models
from documents import services as documents
from projects.models import Project

from .models import OrderItem, Product, ProductFile, ShippingZone, ShopOrder, StockMovement

MAX_LINES = 20
MAX_QUANTITY = 50


def _fail(field, message):
    raise ValidationError({field: message})


# --- catalogue ------------------------------------------------------------------------
def published_products():
    return Product.objects.filter(published=True)


def get_product(slug) -> Product:
    try:
        return published_products().get(slug=slug)
    except Product.DoesNotExist:
        raise NotFound() from None


def active_zones():
    return ShippingZone.objects.filter(active=True)


# --- order state --------------------------------------------------------------------------
def is_paid(order: ShopOrder) -> bool:
    return bool(order.invoice_id) and billing.payment_state(order.invoice) == "paid"


def has_physical(order: ShopOrder) -> bool:
    return any(i.kind == Product.Kind.PHYSICAL for i in order.items.all())


def status(order: ShopOrder) -> str:
    if order.cancelled_at:
        return "cancelled"
    if not is_paid(order):
        return "payment_review" if order.claimed_at else "awaiting_payment"
    if not has_physical(order):
        return "completed"
    if order.delivered_at:
        return "delivered"
    return "shipped" if order.shipped_at else "processing"


def expires_at(order: ShopOrder):
    """When an unpaid order will be released. None once the customer says they paid."""
    if order.cancelled_at or order.claimed_at or is_paid(order):
        return None
    return order.created_at + timedelta(hours=settings.SHOP_PAYMENT_HOURS)


def visible_orders(user):
    qs = ShopOrder.objects.select_related("customer", "invoice", "shipping_zone").prefetch_related(
        "items", "invoice__items", "invoice__payments", "invoice__installments"
    )
    return qs if user.is_staff else qs.filter(customer=user)


def get_order(user, pk) -> ShopOrder:
    try:
        return visible_orders(user).get(pk=pk)
    except (ShopOrder.DoesNotExist, ValueError):
        raise NotFound() from None


# --- creating an order --------------------------------------------------------------------
def _notify_owner(subject, body):
    send_mail(
        subject, body, settings.DEFAULT_FROM_EMAIL, [settings.BUSINESS_EMAIL], fail_silently=True
    )


def _system_project(customer) -> Project:
    project, _ = Project.objects.get_or_create(
        client=customer,
        is_system=True,
        defaults={"title": "Shop orders", "status": Project.Status.ACTIVE},
    )
    return project


@transaction.atomic
def create_order(*, customer, items, zone=None, ship=None, note="", request=None) -> ShopOrder:
    if not items:
        _fail("items", "Your cart is empty.")
    if len(items) > MAX_LINES:
        _fail("items", "Too many different products in one order.")
    wanted: dict[int, int] = {}
    for line in items:
        wanted[line["product"].pk] = wanted.get(line["product"].pk, 0) + line["quantity"]

    # Lock the product rows (in a fixed order) so two buyers cannot take the last unit together.
    products = list(
        Product.objects.select_for_update().filter(pk__in=wanted, published=True).order_by("pk")
    )
    if len(products) != len(wanted):
        _fail("items", "One of these products is no longer available.")
    currencies = {p.currency for p in products}
    if len(currencies) > 1:
        _fail("items", "Products priced in different currencies need separate orders.")
    currency = currencies.pop()

    for p in products:
        qty = wanted[p.pk]
        if qty < 1 or qty > MAX_QUANTITY:
            _fail("items", f"Choose between 1 and {MAX_QUANTITY} of {p.title}.")
        if p.kind == Product.Kind.DIGITAL:
            if qty != 1:
                _fail("items", f"{p.title} is a download; buy it once.")
            if not p.files.exists():
                _fail("items", f"{p.title} is not ready for sale yet.")
        elif p.stock < qty:
            _fail("items", f"{p.title} is out of stock.")

    physical = [p for p in products if p.kind == Product.Kind.PHYSICAL]
    fee, ship = Decimal("0.00"), ship or {}
    if physical:
        if zone is None or not zone.active or zone.currency != currency:
            _fail("shipping_zone", "Choose a delivery area.")
        if not all(ship.get(k, "").strip() for k in ("name", "phone", "address")):
            _fail("shipping", "Enter the name, phone number and address for delivery.")
        fee = zone.fee

    order = ShopOrder.objects.create(
        number=billing.next_number("SHP"),
        customer=customer,
        currency=currency,
        shipping_zone=zone if physical else None,
        shipping_fee=fee,
        ship_name=ship.get("name", "").strip() if physical else "",
        ship_phone=ship.get("phone", "").strip() if physical else "",
        ship_address=ship.get("address", "").strip() if physical else "",
        note=note,
    )
    invoice_items = []
    for p in products:
        qty = wanted[p.pk]
        OrderItem.objects.create(
            order=order, product=p, title=p.title, kind=p.kind, unit_price=p.price, quantity=qty
        )
        if p.kind == Product.Kind.PHYSICAL:
            StockMovement.objects.create(
                product=p, delta=-qty, reason=StockMovement.Reason.SALE, order=order
            )
        invoice_items.append(
            {
                "description": p.title,
                "quantity": Decimal(qty),
                "unit_price": p.price,
                "cycle": Cycle.ONE_TIME,
            }
        )
    if fee > 0:
        invoice_items.append(
            {
                "description": f"Delivery - {zone.name}",
                "quantity": Decimal(1),
                "unit_price": fee,
                "cycle": Cycle.ONE_TIME,
            }
        )
    invoice = billing.save_invoice(
        user=None,
        project=_system_project(customer),
        title=f"Shop order {order.number}",
        currency=currency,
        discount=Decimal("0"),
        due_date=(timezone.now() + timedelta(hours=settings.SHOP_PAYMENT_HOURS)).date(),
        items=invoice_items,
        installments=[],
    )
    billing.issue_invoice(invoice=invoice, user=None)
    order.invoice = invoice
    order.save(update_fields=["invoice"])
    record("shop_order_placed", request=request, user=customer)
    _notify_owner(
        f"New shop order {order.number}",
        f"{customer.email} placed order {order.number}.\n{settings.FRONTEND_URL}/app/shop",
    )
    return order


# --- paying (manual: bKash, Nagad, bank) ---------------------------------------------------
def claim_payment(*, order: ShopOrder, user, method, reference, request=None) -> ShopOrder:
    if order.cancelled_at or is_paid(order):
        _fail("detail", "This order is not waiting for payment.")
    if not reference.strip():
        _fail("reference", "Enter the transaction ID so I can find your payment.")
    order.claimed_method, order.claimed_reference = method, reference.strip()
    order.claimed_at = timezone.now()
    order.save(update_fields=["claimed_method", "claimed_reference", "claimed_at"])
    record("shop_payment_claimed", request=request, user=user)
    _notify_owner(
        f"Payment to check: {order.number}",
        f"{user.email} says they paid {method} {order.claimed_reference} for {order.number}.\n"
        f"{settings.FRONTEND_URL}/app/shop",
    )
    return order


@transaction.atomic
def confirm_payment(*, order: ShopOrder, user, method=None, reference=None, request=None):
    """Staff checked the money arrived. Records the full amount on the invoice."""
    order = ShopOrder.objects.select_for_update().get(pk=order.pk)
    if order.cancelled_at:
        _fail("detail", "This order was cancelled.")
    due = billing.outstanding(order.invoice)
    if due <= 0:
        _fail("detail", "This order is already paid.")
    billing.record_payment(
        invoice=order.invoice,
        user=user,
        request=request,
        amount=due,
        method=method or order.claimed_method or "other",
        paid_on=timezone.localdate(),
        reference=reference or order.claimed_reference,
    )
    return order


@transaction.atomic
def cancel_order(*, order: ShopOrder, user=None, request=None) -> ShopOrder:
    order = ShopOrder.objects.select_for_update().get(pk=order.pk)
    if order.cancelled_at:
        return order
    if order.shipped_at or billing.paid_total(order.invoice) > 0:
        _fail("detail", "A paid order cannot be cancelled here. Please contact me.")
    for item in order.items.filter(kind=Product.Kind.PHYSICAL):
        StockMovement.objects.create(
            product=item.product,
            delta=item.quantity,
            reason=StockMovement.Reason.RELEASE,
            order=order,
        )
    billing.cancel_invoice(invoice=order.invoice, user=user, request=request)
    order.cancelled_at = timezone.now()
    order.save(update_fields=["cancelled_at"])
    record("shop_order_cancelled", request=request, user=user)
    return order


def release_unpaid() -> int:
    """Hourly job: return stock of unpaid orders. Orders with a payment claim wait for a check."""
    cutoff = timezone.now() - timedelta(hours=settings.SHOP_PAYMENT_HOURS)
    stale = ShopOrder.objects.filter(
        cancelled_at__isnull=True, claimed_at__isnull=True, created_at__lt=cutoff
    ).select_related("invoice")
    released = 0
    for order in stale:
        if is_paid(order) or billing.paid_total(order.invoice) > 0:
            continue
        cancel_order(order=order)
        released += 1
    return released


# --- delivery ---------------------------------------------------------------------------------
def mark_shipped(*, order: ShopOrder, user, tracking="", request=None) -> ShopOrder:
    if order.cancelled_at or not is_paid(order) or not has_physical(order):
        _fail("detail", "Only a paid order with physical items can be shipped.")
    if order.shipped_at:
        _fail("detail", "This order was already shipped.")
    order.shipped_at, order.tracking = timezone.now(), tracking.strip()
    order.save(update_fields=["shipped_at", "tracking"])
    record("shop_order_shipped", request=request, user=user)
    send_mail(
        f"Your order {order.number} is on its way",
        f"Order {order.number} has been shipped. {order.tracking}\n"
        f"{settings.FRONTEND_URL}/app/shop/{order.pk}\n\n{settings.BUSINESS_NAME}",
        settings.DEFAULT_FROM_EMAIL,
        [order.customer.email],
        fail_silently=True,
    )
    return order


def mark_delivered(*, order: ShopOrder, user, request=None) -> ShopOrder:
    if not order.shipped_at or order.delivered_at:
        _fail("detail", "Only a shipped order can be marked delivered.")
    order.delivered_at = timezone.now()
    order.save(update_fields=["delivered_at"])
    record("shop_order_delivered", request=request, user=user)
    return order


# --- downloads (digital) ------------------------------------------------------------------------
def buyer_can_download(user, document_id) -> bool:
    """True only for the customer of a paid, not-cancelled order that contains this file."""
    orders = (
        ShopOrder.objects.filter(
            customer=user, cancelled_at__isnull=True, items__product__files__document_id=document_id
        )
        .select_related("invoice")
        .distinct()
    )
    return any(is_paid(o) for o in orders)


def download_links(*, order: ShopOrder, user, request) -> list[dict]:
    if order.cancelled_at or not is_paid(order):
        _fail("detail", "Downloads open as soon as your payment is confirmed.")
    links = []
    for item in order.items.filter(kind=Product.Kind.DIGITAL).select_related("product"):
        for pf in item.product.files.select_related("document"):
            if pf.document.deleted_at:
                continue
            link = documents.download_link(user=user, doc=pf.document, request=request)
            links.append({"product": item.title, **link})
    return links


# --- staff editing of products, stock, files and delivery areas ----------------------------------
def adjust_stock(*, product: Product, delta: int, reason: str, note="", user=None, request=None):
    """Add a stock movement by hand. Stock can never be taken below zero."""
    if product.kind != Product.Kind.PHYSICAL:
        _fail("detail", "Only delivered products have stock.")
    if reason not in (StockMovement.Reason.RESTOCK, StockMovement.Reason.ADJUSTMENT):
        _fail("reason", "Choose restock or count correction.")
    if delta == 0:
        _fail("delta", "Enter how many to add or remove.")
    if reason == StockMovement.Reason.RESTOCK and delta < 0:
        _fail("delta", "A restock adds units. Use a count correction to remove some.")
    with transaction.atomic():
        locked = Product.objects.select_for_update().get(pk=product.pk)
        if (locked.stock or 0) + delta < 0:
            _fail("delta", f"Only {locked.stock} in stock; you cannot remove more than that.")
        move = StockMovement.objects.create(
            product=locked, delta=delta, reason=reason, note=note[:200], created_by=user
        )
    record("stock_adjusted", request=request, user=user)
    return move


def attach_file(*, product: Product, document_id, user=None, request=None):
    if product.kind != Product.Kind.DIGITAL:
        _fail("detail", "Only download products carry files.")
    doc = documents_models.Document.objects.filter(pk=document_id, deleted_at__isnull=True).first()
    if doc is None:
        raise NotFound()
    ProductFile.objects.get_or_create(product=product, document=doc)
    record("product_file_attached", request=request, user=user)


def detach_file(*, product: Product, document_id, user=None, request=None):
    if product.published and product.files.count() <= 1:
        _fail("detail", "Hide this product before removing its last file.")
    product.files.filter(document_id=document_id).delete()
    record("product_file_detached", request=request, user=user)


def check_can_publish(product: Product):
    """A download with no file would sell something that cannot be delivered."""
    no_file = product.pk is None or not product.files.exists()  # a new product has no files yet
    if product.kind == Product.Kind.DIGITAL and no_file:
        _fail("published", "Attach a file before you publish a download product.")


def delete_product(*, product: Product, user=None, request=None):
    if OrderItem.objects.filter(product=product).exists():
        _fail("detail", "This product has orders. Hide it (untick Published) instead of deleting.")
    StockMovement.objects.filter(product=product).delete()
    product.delete()
    record("product_deleted", request=request, user=user)


def delete_zone(*, zone: ShippingZone, user=None, request=None):
    if ShopOrder.objects.filter(shipping_zone=zone).exists():
        _fail("detail", "Orders use this area. Switch it off (untick Active) instead of deleting.")
    zone.delete()
    record("zone_deleted", request=request, user=user)
