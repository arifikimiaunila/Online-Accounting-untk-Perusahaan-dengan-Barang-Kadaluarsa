from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ChartOfAccountViewSet,
    JournalEntryViewSet,
    dashboard_summary,
)

router = DefaultRouter()
router.register("accounts", ChartOfAccountViewSet)
router.register("journal-entries", JournalEntryViewSet)

urlpatterns = router.urls + [
    path("dashboard/summary", dashboard_summary, name="dashboard-summary"),
]
