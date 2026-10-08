from rest_framework import serializers

from documents.models import Document
from projects.models import Project

from .models import Expense, ExternalIncome, Settlement
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


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalIncome
        fields = ["id", "earned_on", "source", "description", "amount", "currency", "created_at"]
        read_only_fields = ["id", "created_at"]


class SettlementSerializer(serializers.ModelSerializer):
    """Typed fields in, calculated figures out (read-only), so the numbers cannot be faked."""

    converted_usd = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    before_deductions_bdt = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    effective_rate = serializers.DecimalField(max_digits=12, decimal_places=4, read_only=True)
    keep_per_dollar = serializers.DecimalField(max_digits=12, decimal_places=4, read_only=True)
    waterfall = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = [
            "id", "settled_on", "source", "note", "earned_usd", "marketplace_fee_usd",
            "transfer_fee_usd", "reference_rate", "received_bdt", "bank_charge_bdt", "vat_bdt",
            "tax_withheld_bdt", "other_charge_bdt", "converted_usd", "before_deductions_bdt",
            "effective_rate", "keep_per_dollar", "waterfall", "created_at",
        ]  # fmt: skip
        read_only_fields = ["id", "created_at"]

    def get_waterfall(self, settlement):
        return settlement.waterfall()


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
