from django.contrib import admin

from .models import Invoice, Payment, Quotation

# Read-only: money records change only through the API, where the rules are enforced.


class ReadOnly(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Quotation)
class QuotationAdmin(ReadOnly):
    list_display = ("number", "project", "status", "created_at")


@admin.register(Invoice)
class InvoiceAdmin(ReadOnly):
    list_display = ("number", "project", "status", "created_at")


@admin.register(Payment)
class PaymentAdmin(ReadOnly):
    list_display = ("invoice", "amount", "method", "paid_on")
