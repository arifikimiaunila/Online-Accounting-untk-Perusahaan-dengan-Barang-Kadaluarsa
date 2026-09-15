from django_filters import DateFromToRangeFilter, FilterSet
from rest_framework import viewsets

from .models import Sale, SaleItem
from .serializers import SaleItemSerializer, SaleSerializer


class SaleFilter(FilterSet):
    date = DateFromToRangeFilter()

    class Meta:
        model = Sale
        fields = ["payment_method", "customer"]


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("customer").prefetch_related("items")
    serializer_class = SaleSerializer
    filterset_class = SaleFilter
    search_fields = ["sale_id"]
    ordering_fields = ["date", "total_amount"]

    def destroy(self, request, *args, **kwargs):
        # Menghapus penjualan mengembalikan stok dan menghapus jurnal terkait.
        from apps.catalog.services import StockLine, add_stock
        from apps.accounting.models import JournalEntry

        instance = self.get_object()
        for item in instance.items.all():
            add_stock(
                StockLine(
                    product_id=item.product_id,
                    quantity=item.quantity,
                    batch_id=item.batch_id,
                ),
                tx_date=instance.date,
                reference_type="cancel",
                reference_id=instance.sale_id,
                notes=f"Pembatalan penjualan #{instance.sale_id}",
            )
        JournalEntry.objects.filter(
            reference_type="sale", reference_id=instance.sale_id
        ).delete()
        return super().destroy(request, *args, **kwargs)


class SaleItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SaleItem.objects.select_related("sale", "product", "batch").all()
    serializer_class = SaleItemSerializer
    filterset_fields = ["sale", "product"]
