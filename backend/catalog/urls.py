from django.urls import path

from . import views as v

urlpatterns = [
    path("catalog/services/", v.ServiceList.as_view()),
    path("catalog/services/<slug:slug>/", v.ServiceDetail.as_view()),
    path("catalog/orders/", v.OrderList.as_view()),
    *[
        path(f"catalog/orders/<uuid:pk>/{a}/", v.OrderAction.as_view(action=a))
        for a in ("accept", "decline", "cancel")
    ],
]
