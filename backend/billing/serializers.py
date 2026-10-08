from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from projects.models import Project

from . import services
from .models import Currency, Cycle, Payment, RecurringInvoice, TaxRate


class ItemIn(serializers.Serializer):
    description = serializers.CharField(max_length=300)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit_price_max = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    details = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    time_estimate = serializers.CharField(max_length=60, required=False, allow_blank=True)
    risk = serializers.ChoiceField(choices=["", "low", "mid", "high"], required=False)
    work_state = serializers.ChoiceField(choices=["", "new", "partial", "done"], required=False)
    note = serializers.CharField(max_length=300, required=False, allow_blank=True)
    counted = serializers.BooleanField(default=True)
    cycle = serializers.ChoiceField(choices=Cycle.choices, default=Cycle.ONE_TIME)


class InstallmentIn(serializers.Serializer):
    label = serializers.CharField(max_length=80)
    percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    due_date = serializers.DateField(required=False, allow_null=True)


class DocumentIn(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_active=True, is_staff=False), required=False
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.filter(deleted_at__isnull=True), required=False
    )
    prefix = serializers.CharField(max_length=8, required=False, allow_blank=True)
    number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    issue_date = serializers.DateField(required=False)
    bill_to_address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    tax_name = serializers.CharField(max_length=40, required=False, allow_blank=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    subtitle = serializers.CharField(max_length=300, required=False, allow_blank=True)
    revision = serializers.CharField(max_length=20, required=False, allow_blank=True)
    title = serializers.CharField(max_length=200)
    currency = serializers.ChoiceField(choices=Currency.choices, default=Currency.BDT)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    items = ItemIn(many=True)


class SectionIn(serializers.Serializer):
    heading = serializers.CharField(max_length=120)
    body = serializers.CharField(max_length=3000, allow_blank=True)


class RiskIn(serializers.Serializer):
    risk = serializers.CharField(max_length=160)
    impact = serializers.CharField(max_length=400, allow_blank=True)


class PlanStepIn(serializers.Serializer):
    label = serializers.CharField(max_length=80)
    percent = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)


class QuotationIn(DocumentIn):
    sections = SectionIn(many=True, required=False, max_length=12)
    risks = RiskIn(many=True, required=False, max_length=20)
    payment_plan = PlanStepIn(many=True, required=False, max_length=8)
    valid_until = serializers.DateField(required=False, allow_null=True)
    proposal_text = serializers.CharField(max_length=5000, required=False, allow_blank=True)


class InvoiceIn(DocumentIn):
    due_date = serializers.DateField(required=False, allow_null=True)
    installments = InstallmentIn(many=True, required=False)


class TaxIn(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = ["id", "name", "rate", "active", "position"]
        read_only_fields = ["id"]

    def validate_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("The rate must be between 0 and 100.")
        return value


class RecurringIn(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_active=True, is_staff=False), required=False
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.filter(deleted_at__isnull=True), required=False
    )
    title = serializers.CharField(max_length=200)
    prefix = serializers.CharField(max_length=8, required=False, allow_blank=True)
    currency = serializers.ChoiceField(choices=Currency.choices, default=Currency.BDT)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_name = serializers.CharField(max_length=40, required=False, allow_blank=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    bill_to_address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    frequency = serializers.ChoiceField(choices=RecurringInvoice.Frequency.choices)
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)
    due_days = serializers.IntegerField(min_value=0, max_value=365, default=15)
    auto_issue = serializers.BooleanField(default=False)
    items = ItemIn(many=True)


class ConvertIn(serializers.Serializer):
    due_date = serializers.DateField(required=False, allow_null=True)
    installments = InstallmentIn(many=True, required=False)


class PaymentIn(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    paid_on = serializers.DateField()
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    note = serializers.CharField(max_length=300, required=False, allow_blank=True)


def exact(value):
    """Money leaves the API as an exact string. DRF would turn a bare Decimal into a float."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: exact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [exact(v) for v in value]
    return value


def _items(doc):
    return [
        {
            "id": i.id,
            "description": i.description,
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "cycle": i.cycle,
            "amount": i.amount,
            "unit_price_max": i.unit_price_max,
            "details": i.details,
            "time_estimate": i.time_estimate,
            "risk": i.risk,
            "work_state": i.work_state,
            "note": i.note,
            "counted": i.counted,
        }
        for i in doc.items.all()
    ]


def _bill_to_name(doc) -> str:
    profile = getattr(doc.project.client, "client_profile", None)
    return (profile.company or profile.full_name) if profile else ""


def _base(doc):
    return {
        "id": doc.id,
        "number": doc.number,
        "title": doc.title,
        "project": doc.project_id,
        "project_title": doc.project.title,
        "project_system": doc.project.is_system,
        "client_email": doc.project.client.email,
        "client": doc.project.client_id,
        "number_prefix": doc.prefix,
        "issue_date": doc.issue_date,
        "bill_to_address": doc.bill_to_address,
        "bill_to_name": _bill_to_name(doc),
        "subtitle": doc.subtitle,
        "revision": doc.revision,
        "currency": doc.currency,
        "discount": doc.discount,
        "tax_name": doc.tax_name,
        "tax_rate": doc.tax_rate,
        "tax": services.tax_amount(doc),
        "notes": doc.notes,
        "status": doc.status,
        "subtotal": services.subtotal(doc),
        "subtotal_max": services.subtotal_max(doc),
        "total": services.total(doc),
        "items": _items(doc),
        "created_at": doc.created_at,
    }


def quotation_out(q):
    invoice = getattr(q, "invoice", None)
    return exact(
        {
            **_base(q),
            "valid_until": q.valid_until,
            "proposal_text": q.proposal_text,
            "sections": q.sections,
            "risks": q.risks,
            "payment_plan": q.payment_plan,
            "sent_at": q.sent_at,
            "decided_at": q.decided_at,
            "invoice_id": invoice.id if invoice else None,
        }
    )


def invoice_out(inv):
    return exact(
        {
            **_base(inv),
            "state": services.payment_state(inv),
            "due_date": inv.due_date,
            "issued_at": inv.issued_at,
            "quotation_id": inv.quotation_id,
            "paid_total": services.paid_total(inv),
            "outstanding": services.outstanding(inv),
            "installments": [
                {
                    "id": r["inst"].id,
                    "label": r["inst"].label,
                    "amount": r["inst"].amount,
                    "due_date": r["inst"].due_date,
                    "paid": r["paid"],
                    "state": r["state"],
                }
                for r in services.schedule(inv)
            ],
            "payments": [
                {
                    "id": p.id,
                    "amount": p.amount,
                    "method": p.method,
                    "reference": p.reference,
                    "paid_on": p.paid_on,
                    "note": p.note,
                }
                for p in inv.payments.all()
            ],
        }
    )
