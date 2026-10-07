from django.urls import path

from . import views as v

urlpatterns = [
    path("shop/products/", v.ProductList.as_view()),
    path("shop/products/<slug:slug>/", v.ProductDetail.as_view()),
    path("shop/zones/", v.ZoneList.as_view()),
    path("shop/images/", v.ImageUpload.as_view()),
    path("shop/images/<str:name>", v.LocalImage.as_view()),
    path("shop/orders/", v.OrderList.as_view()),
    path("shop/orders/<uuid:pk>/", v.OrderDetail.as_view()),
    path("shop/orders/<uuid:pk>/files/", v.OrderFiles.as_view()),
    *[
        path(f"shop/orders/<uuid:pk>/{a}/", v.OrderAction.as_view(action=a))
        for a in ("claim", "cancel", "confirm-payment", "ship", "deliver")
    ],
]
