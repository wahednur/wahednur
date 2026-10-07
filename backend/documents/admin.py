from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "client",
        "shared_with_client",
        "size",
        "created_at",
        "deleted_at",
    )
    list_filter = ("category", "shared_with_client")
    search_fields = ("title", "original_name", "client__email")
    # Files are managed through the API (type, size and content checks); admin is read-only.
    readonly_fields = [f.name for f in Document._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
