from django.contrib import admin

from .models import ClientProfile, Milestone, Project, ProjectUpdate


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "client", "status", "due_date", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "client__email")
    inlines = [MilestoneInline]


admin.site.register(ClientProfile)
admin.site.register(ProjectUpdate)
