from django.conf import settings
from rest_framework import serializers

from billing import services as billing
from billing.models import Payment
from billing.serializers import exact

from . import services
from .models import Product, ShippingZone


def product_out(p: Product):
    return exact(
        {
            "slug": p.slug,
            "title": p.title,
            "summary": p.summary,
            "description": p.description,
            "kind": p.kind,
            "price": p.price,
            "currency": p.currency,
            "image_url": p.image_url,
            # Availability only. No countdowns or "only 2 left" nudges.
            "in_stock": True if p.kind == Product.Kind.DIGITAL else (p.stock or 0) > 0,
        }
    )


def zone_out(z: ShippingZone):
    return exact({"id": z.id, "name": z.name, "fee": z.fee, "currency": z.currency})


class LineIn(serializers.Serializer):
    product = serializers.SlugRelatedField(
        slug_field="slug", queryset=Product.objects.filter(published=True)
    )
    quantity = serializers.IntegerField(min_value=1, max_value=services.MAX_QUANTITY, default=1)


class ShipIn(serializers.Serializer):
    name = serializers.CharField(max_length=120, allow_blank=True, required=False)
    phone = serializers.CharField(max_length=30, allow_blank=True, required=False)
    address = serializers.CharField(max_length=300, allow_blank=True, required=False)


class OrderIn(serializers.Serializer):
    items = LineIn(many=True)
    shipping_zone = serializers.PrimaryKeyRelatedField(
        queryset=ShippingZone.objects.filter(active=True), required=False, allow_null=True
    )
    shipping = ShipIn(required=False)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True)


class ClaimIn(serializers.Serializer):
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    reference = serializers.CharField(max_length=100)


class ShipOut(serializers.Serializer):
    tracking = serializers.CharField(max_length=200, required=False, allow_blank=True)


class ConfirmIn(serializers.Serializer):
    method = serializers.ChoiceField(choices=Payment.Method.choices, required=False)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)


def order_out(o):
    paid = services.is_paid(o)
    inv = o.invoice
    return exact(
        {
            "id": o.id,
            "number": o.number,
            "status": services.status(o),
            "customer_email": o.customer.email,
            "currency": o.currency,
            "items": [
                {
                    "title": i.title,
                    "kind": i.kind,
                    "unit_price": i.unit_price,
                    "quantity": i.quantity,
                    "amount": i.amount,
                }
                for i in o.items.all()
            ],
            "shipping_fee": o.shipping_fee,
            "shipping_zone": o.shipping_zone.name if o.shipping_zone else None,
            "ship_to": {"name": o.ship_name, "phone": o.ship_phone, "address": o.ship_address}
            if o.ship_address
            else None,
            "note": o.note,
            "total": billing.total(inv),
            "outstanding": billing.outstanding(inv),
            "paid": paid,
            "invoice": inv.id,
            "payment_note": settings.INVOICE_PAYMENT_NOTE,
            "claimed": {
                "method": o.claimed_method,
                "reference": o.claimed_reference,
                "at": o.claimed_at,
            }
            if o.claimed_at
            else None,
            "expires_at": services.expires_at(o),
            "tracking": o.tracking,
            "shipped_at": o.shipped_at,
            "delivered_at": o.delivered_at,
            "has_downloads": paid
            and not o.cancelled_at
            and any(i.kind == "digital" for i in o.items.all()),
            "created_at": o.created_at,
        }
    )
