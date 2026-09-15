from django_filters import DateFromToRangeFilter, FilterSet
from rest_framework import viewsets

from apps.accounting.models import JournalEntry
from apps.catalog.services import deduct_stock, StockLine, InsufficientStockError
from rest_framework.exceptions import ValidationError

from .models import Purchase, PurchaseItem
from .serializers import PurchaseItemSerializer, PurchaseSerializer


class PurchaseFilter(FilterSet):
    date = DateFromToRangeFilter()

    class Meta:
        model = Purchase
        fields = ["supplier"]


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related("supplier").prefetch_related("items")
    serializer_class = PurchaseSerializer
    filterset_class = PurchaseFilter
    search_fields = ["purchase_id"]
    ordering_fields = ["date", "total_amount"]

    def destroy(self, request, *args, **kwargs):
        # Menghapus pembelian: kurangi stok sesuai item & hapus jurnal.
        instance = self.get_object()
        for item in instance.items.all():
            try:
                deduct_stock(
                    StockLine(product_id=item.product_id, quantity=item.quantity),
                    tx_date=instance.date,
                    reference_type="cancel",
                    reference_id=instance.purchase_id,
                    notes=f"Pembatalan pembelian #{instance.purchase_id}",
                )
            except InsufficientStockError as exc:
                raise ValidationError(
                    f"Tidak dapat menghapus: {exc}"
                ) from exc
        JournalEntry.objects.filter(
            reference_type="purchase", reference_id=instance.purchase_id
        ).delete()
        return super().destroy(request, *args, **kwargs)


class PurchaseItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PurchaseItem.objects.select_related("purchase", "product", "batch").all()
    serializer_class = PurchaseItemSerializer
    filterset_fields = ["purchase", "product"]
