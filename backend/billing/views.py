from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser
from documents.services import is_uuid

from . import pdf, recurring, services
from . import serializers as s
from .models import TaxRate


def _no_store(response):
    response["Cache-Control"] = "private, no-store"
    return response


class StaffWrite:
    """Reading what you may see needs a verified account; any change needs staff with 2FA."""

    def get_permissions(self):
        safe = self.request.method in ("GET", "HEAD", "OPTIONS")
        return [IsVerifiedUser() if safe else IsStaffMember()]


def _project_for(request, data):
    """Documents belong to a project. Give a client, a project, or both; a client alone uses their
    'General billing' project."""
    from projects import services as project_services

    project = None
    if data.get("project") is not None:
        project = project_services.get_visible(request.user, data["project"].pk)
    return services.project_for(client=data.get("client"), project=project, user=request.user)


# --- quotations -------------------------------------------------------------------
class QuotationList(StaffWrite, APIView):
    def get(self, request):
        rows = services.visible_quotations(request.user)
        project = request.query_params.get("project")
        if project:
            rows = rows.filter(project_id=project) if is_uuid(project) else rows.none()
        return _no_store(Response([s.quotation_out(q) for q in rows]))

    def post(self, request):
        data = s.QuotationIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = dict(data.validated_data)
        project = _project_for(request, d)
        d.pop("project", None)
        d.pop("client", None)
        q = services.save_quotation(user=request.user, project=project, **d)
        return Response(s.quotation_out(q), status=status.HTTP_201_CREATED)


class QuotationDetail(StaffWrite, APIView):
    def get(self, request, pk):
        return _no_store(Response(s.quotation_out(services.get_quotation(request.user, pk))))

    def put(self, request, pk):
        q = services.get_quotation(request.user, pk)
        data = s.QuotationIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = dict(data.validated_data)
        d.pop("project", None)
        d.pop("client", None)
        q = services.save_quotation(user=request.user, quotation=q, **d)
        return Response(s.quotation_out(q))


class QuotationAction(APIView):
    """send / convert: staff. accept / reject: the client of the project, or staff."""

    action = ""

    def get_permissions(self):
        return [IsStaffMember() if self.action in ("send", "convert", "dead") else IsVerifiedUser()]

    def post(self, request, pk):
        q = services.get_quotation(request.user, pk)
        user = request.user
        if self.action == "send":
            services.send_quotation(quotation=q, user=user, request=request)
        elif self.action == "dead":
            services.mark_dead(quotation=q, user=user, request=request)
        elif self.action == "convert":
            data = s.ConvertIn(data=request.data)
            data.is_valid(raise_exception=True)
            inv = services.convert_quotation(
                quotation=q,
                user=user,
                request=request,
                installments=data.validated_data.get("installments", []),
                due_date=data.validated_data.get("due_date"),
            )
            return Response(s.invoice_out(inv), status=status.HTTP_201_CREATED)
        else:
            services.decide_quotation(
                quotation=q, accept=self.action == "accept", user=user, request=request
            )
        return Response(s.quotation_out(q))


# --- invoices ---------------------------------------------------------------------
class InvoiceList(StaffWrite, APIView):
    def get(self, request):
        rows = services.visible_invoices(request.user)
        project = request.query_params.get("project")
        if project:
            rows = rows.filter(project_id=project) if is_uuid(project) else rows.none()
        return _no_store(Response([s.invoice_out(i) for i in rows]))

    def post(self, request):
        data = s.InvoiceIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = dict(data.validated_data)
        project = _project_for(request, d)
        d.pop("project", None)
        d.pop("client", None)
        d.setdefault("installments", [])
        inv = services.save_invoice(user=request.user, project=project, **d)
        return Response(s.invoice_out(inv), status=status.HTTP_201_CREATED)


class InvoiceDetail(StaffWrite, APIView):
    def get(self, request, pk):
        return _no_store(Response(s.invoice_out(services.get_invoice(request.user, pk))))

    def put(self, request, pk):
        inv = services.get_invoice(request.user, pk)
        data = s.InvoiceIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = dict(data.validated_data)
        d.pop("project", None)
        d.pop("client", None)
        d.setdefault("installments", [])
        inv = services.save_invoice(user=request.user, invoice=inv, **d)
        return Response(s.invoice_out(inv))


class InvoiceAction(APIView):
    permission_classes = [IsStaffMember]
    action = ""

    def post(self, request, pk):
        inv = services.get_invoice(request.user, pk)
        if self.action == "issue":
            services.issue_invoice(invoice=inv, user=request.user, request=request)
        elif self.action == "cancel":
            services.cancel_invoice(invoice=inv, user=request.user, request=request)
        else:
            data = s.PaymentIn(data=request.data)
            data.is_valid(raise_exception=True)
            services.record_payment(
                invoice=inv, user=request.user, request=request, **data.validated_data
            )
            inv = services.get_invoice(request.user, pk)
            return Response(s.invoice_out(inv), status=status.HTTP_201_CREATED)
        return Response(s.invoice_out(inv))


# --- PDF --------------------------------------------------------------------------
class PdfView(APIView):
    permission_classes = [IsVerifiedUser]
    kind = "Quotation"

    def get(self, request, pk):
        if self.kind == "Quotation":
            doc = services.get_quotation(request.user, pk)
        else:
            doc = services.get_invoice(request.user, pk)
        response = HttpResponse(pdf.render(doc, self.kind), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{doc.number}.pdf"'
        response["X-Content-Type-Options"] = "nosniff"
        return _no_store(response)


# --- tax rates ------------------------------------------------------------------------
class TaxList(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        return Response(s.TaxIn(TaxRate.objects.all(), many=True).data)

    def post(self, request):
        data = s.TaxIn(data=request.data)
        data.is_valid(raise_exception=True)
        data.save()
        return Response(data.data, status=status.HTTP_201_CREATED)


class TaxDetail(APIView):
    permission_classes = [IsStaffMember]

    def put(self, request, pk):
        tax = get_object_or_404(TaxRate, pk=pk)
        data = s.TaxIn(tax, data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        data.save()
        return Response(data.data)

    def delete(self, request, pk):
        # Documents keep their own copy of the rate, so deleting a tax never changes them.
        get_object_or_404(TaxRate, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NextNumber(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        prefix = services._clean_prefix(request.query_params.get("prefix", ""), "INV")
        return Response({"prefix": prefix, "number": services.preview_number(prefix)})


# --- recurring invoices --------------------------------------------------------------
class RecurringList(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        return _no_store(Response([recurring.out(r) for r in recurring.visible()]))

    def post(self, request):
        data = s.RecurringIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = dict(data.validated_data)
        if d.get("project") is not None:
            d["project"] = projects_get(request, d["project"])
        rec = recurring.save_recurring(user=request.user, **d)
        return Response(recurring.out(recurring.get(rec.pk)), status=status.HTTP_201_CREATED)


def projects_get(request, project):
    from projects import services as project_services

    return project_services.get_visible(request.user, project.pk)


class RecurringDetail(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request, pk):
        return _no_store(Response(recurring.out(recurring.get(pk))))

    def put(self, request, pk):
        rec = recurring.get(pk)
        data = s.RecurringIn(data=request.data)
        data.is_valid(raise_exception=True)
        d = dict(data.validated_data)
        d.pop("client", None)
        d.pop("project", None)
        rec = recurring.save_recurring(user=request.user, recurring=rec, **d)
        return Response(recurring.out(recurring.get(rec.pk)))


class RecurringAction(APIView):
    permission_classes = [IsStaffMember]
    action = ""

    def post(self, request, pk):
        rec = recurring.get(pk)
        getattr(recurring, self.action)(rec=rec, user=request.user)
        return Response(recurring.out(recurring.get(pk)))
