from django.urls import path

from . import views as v

urlpatterns = [
    path("billing/taxes/", v.TaxList.as_view()),
    path("billing/taxes/<int:pk>/", v.TaxDetail.as_view()),
    path("billing/next-number/", v.NextNumber.as_view()),
    path("billing/recurring/", v.RecurringList.as_view()),
    path("billing/recurring/<uuid:pk>/", v.RecurringDetail.as_view()),
    *[
        path(f"billing/recurring/<uuid:pk>/{a}/", v.RecurringAction.as_view(action=a))
        for a in ("pause", "resume", "end")
    ],
    path("quotations/", v.QuotationList.as_view()),
    path("quotations/<uuid:pk>/", v.QuotationDetail.as_view()),
    path("quotations/<uuid:pk>/pdf/", v.PdfView.as_view(kind="Quotation")),
    *[
        path(f"quotations/<uuid:pk>/{a}/", v.QuotationAction.as_view(action=a))
        for a in ("send", "accept", "reject", "dead", "convert")
    ],
    path("invoices/", v.InvoiceList.as_view()),
    path("invoices/<uuid:pk>/", v.InvoiceDetail.as_view()),
    path("invoices/<uuid:pk>/pdf/", v.PdfView.as_view(kind="Invoice")),
    *[
        path(f"invoices/<uuid:pk>/{a}/", v.InvoiceAction.as_view(action=a))
        for a in ("issue", "cancel", "payments")
    ],
]
