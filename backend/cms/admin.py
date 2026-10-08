from django.contrib import admin

from .models import Page


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "status", "seo_source", "updated_at")
    list_filter = ("kind", "status")
    search_fields = ("title", "slug")
    readonly_fields = [f.name for f in Page._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
