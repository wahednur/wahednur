from django.urls import path

from . import views as v

urlpatterns = [
    path("accounting/expenses/", v.ExpenseList.as_view()),
    path("accounting/expenses/<int:pk>/", v.ExpenseDetail.as_view()),
    path("accounting/income/", v.IncomeList.as_view()),
    path("accounting/income/<int:pk>/", v.IncomeDetail.as_view()),
    path("accounting/settlements/", v.SettlementList.as_view()),
    path("accounting/settlements/<int:pk>/", v.SettlementDetail.as_view()),
    path("accounting/conversions/", v.Conversions.as_view()),
    path("accounting/summary/", v.Summary.as_view()),
    path("accounting/projects/", v.ProjectProfit.as_view()),
    path("accounting/export/", v.Export.as_view()),
]
