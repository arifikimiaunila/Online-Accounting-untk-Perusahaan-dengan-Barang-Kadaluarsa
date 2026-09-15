"""API URL configuration: aggregates all app routers under /api/."""
from django.urls import include, path

urlpatterns = [
    path("auth/", include("apps.users.urls")),
    path("", include("apps.users.admin_urls")),
    path("", include("apps.catalog.urls")),
    path("", include("apps.parties.urls")),
    path("", include("apps.sales.urls")),
    path("", include("apps.purchases.urls")),
    path("", include("apps.accounting.urls")),
    path("", include("apps.reports.urls")),
]
