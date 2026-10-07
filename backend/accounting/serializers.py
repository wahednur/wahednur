from rest_framework import serializers

from documents.models import Document
from projects.models import Project

from .models import Expense
from .services import ZERO  # noqa: F401


class ExpenseSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.filter(deleted_at__isnull=True), required=False, allow_null=True
    )
    receipt = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.filter(deleted_at__isnull=True), required=False, allow_null=True
    )
    project_title = serializers.CharField(source="project.title", read_only=True, default=None)

    class Meta:
        model = Expense
        fields = [
            "id",
            "spent_on",
            "category",
            "amount",
            "currency",
            "vendor",
            "description",
            "project",
            "project_title",
            "receipt",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


def exact(value):
    """Money leaves the API as exact strings (a bare Decimal would become a float)."""
    from decimal import Decimal

    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: exact(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [exact(v) for v in value]
    return value
