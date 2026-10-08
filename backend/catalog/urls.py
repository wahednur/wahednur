from django.urls import path

from . import manage as m
from . import views as v

urlpatterns = [
    path("catalog/services/", v.ServiceList.as_view()),
    path("catalog/services/<slug:slug>/", v.ServiceDetail.as_view()),
    path("manage/services/", m.ServiceList.as_view()),
    path("manage/services/<int:pk>/", m.ServiceDetail.as_view()),
    path("manage/services/<int:pk>/packages/", m.PackageList.as_view()),
    path("manage/packages/<int:pk>/", m.PackageDetail.as_view()),
    path("catalog/orders/", v.OrderList.as_view()),
    *[
        path(f"catalog/orders/<uuid:pk>/{a}/", v.OrderAction.as_view(action=a))
        for a in ("accept", "decline", "cancel")
    ],
]
