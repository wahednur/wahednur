from django.urls import path

from . import views as v

urlpatterns = [
    path("cms/pages/", v.PublicList.as_view()),
    path("cms/pages/<slug:slug>/", v.PublicDetail.as_view()),
    path("cms/manage/", v.ManageList.as_view()),
    path("cms/manage/<int:pk>/", v.ManageDetail.as_view()),
    path("cms/manage/<int:pk>/seo/", v.SeoManual.as_view()),
    path("cms/manage/<int:pk>/seo/auto/", v.SeoAuto.as_view()),
]
