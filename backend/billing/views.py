from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffMember, IsVerifiedUser
from documents.services import is_uuid

from . import pdf, services
from . import serializers as s


def _no_store(response):
    response["Cache-Control"] = "private, no-store"
    return response


class StaffWrite:
    """Reading what you may see needs a verified account; any change needs staff with 2FA."""

    def get_permissions(self):
        safe = self.request.method in ("GET", "HEAD", "OPTIONS")
        return [IsVerifiedUser() if safe else IsStaffMember()]


def _project_or_error(request, data):
    from rest_framework.exceptions import ValidationError

    from projects import services as project_services

    if "project" not in data:
        raise ValidationError({"project": "Choose a project."})
    return project_services.get_visible(request.user, data["project"].pk)


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
        project = _project_or_error(request, d)
        d.pop("project")
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
        q = services.save_quotation(user=request.user, quotation=q, **d)
        return Response(s.quotation_out(q))


class QuotationAction(APIView):
    """send / convert: staff. accept / reject: the client of the project, or staff."""

    action = ""

    def get_permissions(self):
        return [IsStaffMember() if self.action in ("send", "convert") else IsVerifiedUser()]

    def post(self, request, pk):
        q = services.get_quotation(request.user, pk)
        user = request.user
        if self.action == "send":
            services.send_quotation(quotation=q, user=user, request=request)
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
        project = _project_or_error(request, d)
        d.pop("project")
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
