from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django_filters import DateFromToRangeFilter, FilterSet
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import ChartOfAccount, JournalEntry
from .serializers import ChartOfAccountSerializer, JournalEntrySerializer


class ChartOfAccountViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all()
    serializer_class = ChartOfAccountSerializer
    search_fields = ["code", "name"]
    filterset_fields = ["account_type", "is_active"]


class JournalEntryFilter(FilterSet):
    date = DateFromToRangeFilter()

    class Meta:
        model = JournalEntry
        fields = ["reference_type", "account"]


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.select_related("account").all()
    serializer_class = JournalEntrySerializer
    filterset_class = JournalEntryFilter
    search_fields = ["description"]
    ordering_fields = ["date", "journal_entry_id"]

    @action(detail=False, methods=["get"])
    def trial_balance(self, request):
        """Neraca saldo: total debit & kredit per akun."""
        rows = (
            self.get_queryset()
            .values("account__code", "account__name")
            .annotate(
                total_debit=Sum("debit"),
                total_credit=Sum("credit"),
            )
            .order_by("account__code")
        )
        for row in rows:
            row["total_debit"] = float(row["total_debit"] or 0)
            row["total_credit"] = float(row["total_credit"] or 0)
        total_debit = sum(r["total_debit"] for r in rows)
        total_credit = sum(r["total_credit"] for r in rows)
        return Response(
            {
                "rows": rows,
                "total_debit": total_debit,
                "total_credit": total_credit,
                "balanced": abs(total_debit - total_credit) < 0.01,
            }
        )

    @action(detail=False, methods=["get"])
    def profit_loss(self, request):
        """Laporan laba/rugi sederhana dari akun revenue & expense."""
        revenue = (
            JournalEntry.objects.filter(account__account_type="revenue")
            .aggregate(v=Sum("credit"))["v"]
            or Decimal("0")
        )
        expense = (
            JournalEntry.objects.filter(account__account_type="expense")
            .aggregate(v=Sum("debit"))["v"]
            or Decimal("0")
        )
        # HPP dihitung dari nilai pembelian (akun persediaan).
        return Response(
            {
                "revenue": float(revenue),
                "expense": float(expense),
                "profit": float(revenue - expense),
            }
        )


@api_view(["GET"])
def dashboard_summary(request):
    """Ringkasan angka untuk halaman dashboard."""
    from apps.catalog.models import Inventory, Product, ProductBatch
    from apps.catalog.services import current_valuation
    from apps.sales.models import Sale
    from apps.purchases.models import Purchase

    today = date.today()
    threshold = today + timedelta(days=30)

    total_revenue = (
        Sale.objects.aggregate(v=Sum("total_amount"))["v"] or Decimal("0")
    )
    total_purchase = (
        Purchase.objects.aggregate(v=Sum("total_amount"))["v"] or Decimal("0")
    )
    today_revenue = (
        Sale.objects.filter(date=today).aggregate(v=Sum("total_amount"))["v"]
        or Decimal("0")
    )
    today_sales = Sale.objects.filter(date=today).count()
    sale_count = Sale.objects.count()
    purchase_count = Purchase.objects.count()
    expiring = ProductBatch.objects.filter(
        expiry_date__isnull=False, expiry_date__lte=threshold
    ).count()
    expired = ProductBatch.objects.filter(
        expiry_date__isnull=False, expiry_date__lt=today
    ).count()
    low_stock = (
        Inventory.objects.values("product")
        .annotate(total=Sum("quantity_available"))
        .filter(total__lte=5)
        .count()
    )

    profile = getattr(request.user, "profile", None)
    role = profile.role if profile else ("admin" if request.user.is_superuser else "kasir")

    return Response(
        {
            "role": role,
            "total_revenue": float(total_revenue),
            "total_purchase": float(total_purchase),
            "gross_profit": float(total_revenue - total_purchase),
            "today_revenue": float(today_revenue),
            "today_sales": today_sales,
            "sale_count": sale_count,
            "purchase_count": purchase_count,
            "inventory_value": float(current_valuation()),
            "product_count": Product.objects.count(),
            "expiring_soon": expiring,
            "expired": expired,
            "low_stock": low_stock,
        }
    )
