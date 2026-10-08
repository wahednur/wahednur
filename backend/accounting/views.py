from django.http import HttpResponse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOwner
from accounts.signals import record

from . import services
from .serializers import ExpenseSerializer, IncomeSerializer, SettlementSerializer, exact


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


class _Crud(OwnerOnly):
    """List + create + edit + soft delete for a simple accounting record."""

    serializer = None
    queryset = None
    getter = None
    saver = None
    date_field = ""

    def get(self, request):
        start, end = _dates(request)
        rows = services.date_range(type(self).queryset(), self.date_field, start, end)[:500]
        return _no_store(Response(exact(self.serializer(rows, many=True).data)))

    def post(self, request):
        data = self.serializer(data=request.data)
        data.is_valid(raise_exception=True)
        obj = type(self).saver(user=request.user, request=request, **data.validated_data)
        return Response(exact(self.serializer(obj).data), status=status.HTTP_201_CREATED)


class _CrudDetail(OwnerOnly):
    serializer = None
    getter = None
    saver = None

    def put(self, request, pk):
        obj = type(self).getter(pk)
        data = self.serializer(obj, data=request.data)
        data.is_valid(raise_exception=True)
        obj = type(self).saver(
            user=request.user, request=request, **{self.name: obj}, **data.validated_data
        )
        return Response(exact(self.serializer(obj).data))

    def delete(self, request, pk):
        services.delete_record(obj=type(self).getter(pk), user=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class IncomeList(_Crud):
    serializer = IncomeSerializer
    queryset = staticmethod(services.incomes_qs)
    saver = staticmethod(services.save_income)
    date_field = "earned_on"


class IncomeDetail(_CrudDetail):
    serializer = IncomeSerializer
    getter = staticmethod(services.get_income)
    saver = staticmethod(services.save_income)
    name = "income"


class SettlementList(_Crud):
    serializer = SettlementSerializer
    queryset = staticmethod(services.settlements_qs)
    saver = staticmethod(services.save_settlement)
    date_field = "settled_on"


class SettlementDetail(_CrudDetail):
    serializer = SettlementSerializer
    getter = staticmethod(services.get_settlement)
    saver = staticmethod(services.save_settlement)
    name = "settlement"


class Conversions(OwnerOnly):
    def get(self, request):
        start, end = _dates(request)
        return _no_store(Response(exact(services.conversions(start, end))))
