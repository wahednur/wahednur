from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "email", "need", "status", "notified_at")
    list_filter = ("status", "need")
    search_fields = ("name", "email", "details")
    readonly_fields = (
        "id",
        "name",
        "email",
        "need",
        "details",
        "budget",
        "timeline",
        "ip_hash",
        "notified_at",
        "notify_error",
        "created_at",
    )

    def has_add_permission(self, request):
        return False
