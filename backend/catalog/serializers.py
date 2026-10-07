from rest_framework import serializers

from billing.serializers import exact

from .models import Order, Package, Service


class PackageOut(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = [
            "id",
            "name",
            "tagline",
            "features",
            "price",
            "currency",
            "cycle",
            "delivery_days",
            "revisions",
        ]


def package_out(p):
    return exact(PackageOut(p).data | {"price": p.price})


def service_out(s):
    return {
        "slug": s.slug,
        "title": s.title,
        "summary": s.summary,
        "description": s.description,
        "packages": [package_out(p) for p in s.packages.all() if p.published],
    }


class OrderIn(serializers.Serializer):
    package = serializers.PrimaryKeyRelatedField(queryset=Package.objects.all())
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)


def order_out(o: Order):
    return exact(
        {
            "id": o.id,
            "title": o.title,
            "unit_price": o.unit_price,
            "currency": o.currency,
            "cycle": o.cycle,
            "note": o.note,
            "status": o.status,
            "client_email": o.client.email,
            "project": o.project_id,
            "subscription": getattr(o, "subscription", None) and o.subscription.pk,
            "created_at": o.created_at,
        }
    )


__all__ = ["OrderIn", "Service", "order_out", "package_out", "service_out"]
