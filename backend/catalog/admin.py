from django.contrib import admin

from .models import Order, Package, Service


class PackageInline(admin.StackedInline):
    model = Package
    extra = 0


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "published", "position")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [PackageInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("title", "client", "status", "created_at")
    readonly_fields = [f.name for f in Order._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
