from django.urls import path

from .views import AnalyticsSummaryView, PlayEventListView

urlpatterns = [
    path("plays/", PlayEventListView.as_view(), name="analytics-plays"),
    path("summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
]
