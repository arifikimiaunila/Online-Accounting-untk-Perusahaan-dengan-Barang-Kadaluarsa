from django.urls import path

from .views import (
    ProfitLossView,
    PurchaseReportView,
    SalesReportView,
    StockCardExportView,
    TrialBalanceView,
)

urlpatterns = [
    path("reports/sales/", SalesReportView.as_view(), name="report-sales"),
    path("reports/purchases/", PurchaseReportView.as_view(), name="report-purchases"),
    path("reports/profit-loss/", ProfitLossView.as_view(), name="report-profit-loss"),
    path("reports/trial-balance/", TrialBalanceView.as_view(), name="report-trial-balance"),
    path("reports/stock-card/", StockCardExportView.as_view(), name="report-stock-card"),
]
