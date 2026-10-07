import uuid

from django.conf import settings
from django.db import models
from django.db.models import Sum

from billing.models import MONEY, Currency


class Product(models.Model):
    class Kind(models.TextChoices):
        DIGITAL = "digital", "Digital (download)"
        PHYSICAL = "physical", "Physical (delivered)"

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    summary = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    price = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    image_url = models.URLField(blank=True)  # a public image (public R2 bucket)
    published = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "title"]

    def __str__(self) -> str:
        return self.title

    @property
    def stock(self) -> int | None:
        """Units on hand. Always the sum of the movements, never a number someone typed."""
        if self.kind != self.Kind.PHYSICAL:
            return None
        return self.movements.aggregate(t=Sum("delta"))["t"] or 0


class ProductFile(models.Model):
    """A private file a buyer receives. It lives in the document vault; it is never public."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="files")
    document = models.ForeignKey("documents.Document", on_delete=models.PROTECT, related_name="+")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["product", "document"], name="uniq_file")]

    def __str__(self) -> str:
        return f"{self.product} - {self.document}"


class ShippingZone(models.Model):
    name = models.CharField(max_length=80)
    fee = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BDT)
    active = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "name"]

    def __str__(self) -> str:
        return self.name


class StockMovement(models.Model):
    """Every change to stock is a row here. Nothing edits a stock number directly."""

    class Reason(models.TextChoices):
        RESTOCK = "restock", "Restock"
        SALE = "sale", "Sale (reserved for an order)"
        RELEASE = "release", "Released (order cancelled)"
        ADJUSTMENT = "adjustment", "Count correction"

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    delta = models.IntegerField()
    reason = models.CharField(max_length=12, choices=Reason.choices)
    order = models.ForeignKey(
        "shop.ShopOrder", null=True, blank=True, on_delete=models.PROTECT, related_name="movements"
    )
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.product} {self.delta:+d} ({self.reason})"


class ShopOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    currency = models.CharField(max_length=3, choices=Currency.choices)
    shipping_zone = models.ForeignKey(ShippingZone, null=True, blank=True, on_delete=models.PROTECT)
    shipping_fee = models.DecimalField(default=0, **MONEY)
    ship_name = models.CharField(max_length=120, blank=True)
    ship_phone = models.CharField(max_length=30, blank=True)
    ship_address = models.CharField(max_length=300, blank=True)
    note = models.CharField(max_length=500, blank=True)
    # The money side is a normal invoice, so payments, PDFs and accounting work unchanged.
    invoice = models.OneToOneField(
        "billing.Invoice", null=True, on_delete=models.PROTECT, related_name="shop_order"
    )
    claimed_method = models.CharField(max_length=10, blank=True)
    claimed_reference = models.CharField(max_length=100, blank=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    tracking = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.number


class OrderItem(models.Model):
    order = models.ForeignKey(ShopOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="+")
    title = models.CharField(max_length=160)  # copied, so later edits never change a past order
    kind = models.CharField(max_length=8, choices=Product.Kind.choices)
    unit_price = models.DecimalField(**MONEY)
    quantity = models.PositiveIntegerField()

    def __str__(self) -> str:
        return f"{self.quantity} x {self.title}"

    @property
    def amount(self):
        return self.unit_price * self.quantity
