from django.contrib import admin

from .models import Product, ProductFile, ShippingZone, ShopOrder, StockMovement


class FileInline(admin.TabularInline):
    model = ProductFile
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "price", "currency", "published", "units_in_stock")
    list_filter = ("kind", "published")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [FileInline]

    @admin.display(description="In stock")
    def units_in_stock(self, obj):
        return obj.stock  # calculated from the movements; not editable

    def get_readonly_fields(self, request, obj=None):
        return ["units_in_stock"] if obj else []


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Add restocks and count corrections here. Past rows are a ledger: never edited or deleted."""

    list_display = ("product", "delta", "reason", "note", "created_at")
    list_filter = ("reason",)
    fields = ("product", "delta", "reason", "note")

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "reason":  # sales and releases are created by orders only
            kwargs["choices"] = [
                (StockMovement.Reason.RESTOCK, "Restock"),
                (StockMovement.Reason.ADJUSTMENT, "Count correction"),
            ]
        return super().formfield_for_choice_field(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        return obj is None

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(ShippingZone)


@admin.register(ShopOrder)
class ShopOrderAdmin(admin.ModelAdmin):
    list_display = ("number", "customer", "created_at", "cancelled_at")
    readonly_fields = [f.name for f in ShopOrder._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
