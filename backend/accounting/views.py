from django.http import HttpResponse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOwner
from accounts.signals import record

from . import services
from .serializers import ExpenseSerializer, exact


def _dates(request):
    from datetime import date

    out = []
    for key in ("from", "to"):
        raw = request.query_params.get(key)
        try:
            out.append(date.fromisoformat(raw) if raw else None)
        except ValueError:
            raise ValidationError({key: "Use the format YYYY-MM-DD."}) from None
    return out


class OwnerOnly(APIView):
    """Finances are for the owner only: a superuser with two-factor authentication."""

    permission_classes = [IsOwner]


def _no_store(response):
    response["Cache-Control"] = "private, no-store"
    return response


class ExpenseList(OwnerOnly):
    def get(self, request):
        start, end = _dates(request)
        qs = services.date_range(
            services.expenses_qs().select_related("project"), "spent_on", start, end
        )
        if request.query_params.get("category"):
            qs = qs.filter(category=request.query_params["category"])
        return _no_store(Response(exact(ExpenseSerializer(qs[:500], many=True).data)))

    def post(self, request):
        data = ExpenseSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        e = services.save_expense(user=request.user, request=request, **data.validated_data)
        return Response(exact(ExpenseSerializer(e).data), status=status.HTTP_201_CREATED)


class ExpenseDetail(OwnerOnly):
    def put(self, request, pk):
        e = services.get_expense(pk)
        data = ExpenseSerializer(e, data=request.data)
        data.is_valid(raise_exception=True)
        e = services.save_expense(
            user=request.user, expense=e, request=request, **data.validated_data
        )
        return Response(exact(ExpenseSerializer(e).data))

    def delete(self, request, pk):
        services.delete_expense(
            expense=services.get_expense(pk), user=request.user, request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class Summary(OwnerOnly):
    def get(self, request):
        start, end = _dates(request)
        return _no_store(Response(exact(services.summary(start, end))))


class ProjectProfit(OwnerOnly):
    def get(self, request):
        start, end = _dates(request)
        return _no_store(Response(exact(services.project_profit(start, end))))


class Export(OwnerOnly):
    def get(self, request):
        start, end = _dates(request)
        record("ledger_exported", request=request, user=request.user)
        response = HttpResponse(
            services.ledger_csv(start, end), content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = 'attachment; filename="ledger.csv"'
        return _no_store(response)
