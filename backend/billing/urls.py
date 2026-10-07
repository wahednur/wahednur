from django.urls import path

from . import views as v

urlpatterns = [
    path("quotations/", v.QuotationList.as_view()),
    path("quotations/<uuid:pk>/", v.QuotationDetail.as_view()),
    path("quotations/<uuid:pk>/pdf/", v.PdfView.as_view(kind="Quotation")),
    *[
        path(f"quotations/<uuid:pk>/{a}/", v.QuotationAction.as_view(action=a))
        for a in ("send", "accept", "reject", "convert")
    ],
    path("invoices/", v.InvoiceList.as_view()),
    path("invoices/<uuid:pk>/", v.InvoiceDetail.as_view()),
    path("invoices/<uuid:pk>/pdf/", v.PdfView.as_view(kind="Invoice")),
    *[
        path(f"invoices/<uuid:pk>/{a}/", v.InvoiceAction.as_view(action=a))
        for a in ("issue", "cancel", "payments")
    ],
]
