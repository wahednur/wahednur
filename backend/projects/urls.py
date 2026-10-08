from django.urls import path

from . import views

urlpatterns = [
    path("projects/", views.ProjectListView.as_view(), name="project-list"),
    path("projects/<uuid:pk>/", views.ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<uuid:pk>/milestones/", views.MilestoneListView.as_view()),
    path("projects/<uuid:pk>/updates/", views.UpdateListView.as_view()),
    path("projects/<uuid:pk>/history/", views.HistoryView.as_view()),
    path("projects/<uuid:pk>/reports/", views.ReportListView.as_view()),
    path("projects/<uuid:pk>/reports/draft/", views.ReportDraftView.as_view()),
    path("milestones/<int:pk>/", views.MilestoneDetailView.as_view()),
    path("clients/", views.ClientListView.as_view(), name="client-list"),
    path("clients/<int:pk>/", views.ClientDetailView.as_view()),
]
