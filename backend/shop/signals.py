"""Keep the public shop pages fresh: a product edit or a stock change refreshes its pages."""

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from cms.tasks import revalidate_frontend

from .models import Product, StockMovement


def _refresh(product: Product):
    paths = ["/shop", f"/shop/{product.slug}", "/sitemap.xml"]
    transaction.on_commit(lambda: revalidate_frontend.delay(paths))


@receiver([post_save, post_delete], sender=Product)
def _product_changed(sender, instance, **kwargs):
    _refresh(instance)


@receiver(post_save, sender=StockMovement)
def _stock_changed(sender, instance, created, **kwargs):
    if created:
        _refresh(instance.product)
