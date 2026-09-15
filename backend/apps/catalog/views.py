from datetime import date, timedelta

from django.db.models import Count, Sum
from django_filters import DateFromToRangeFilter, FilterSet
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category, Inventory, Product, ProductBatch, StockMovement
from .serializers import (
    CategorySerializer,
    InventorySerializer,
    ProductBatchSerializer,
    ProductSerializer,
    StockMovementSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["name"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    filterset_fields = ["category", "has_expiry"]
    search_fields = ["name", "sku"]
    ordering_fields = ["name", "sku", "price", "created_at"]


class ProductBatchViewSet(viewsets.ModelViewSet):
    queryset = ProductBatch.objects.select_related("product").all()
    serializer_class = ProductBatchSerializer
    filterset_fields = ["product", "expiry_date"]
    search_fields = ["batch_code", "product__name"]

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        """Batch yang akan kedaluwarsa dalam N hari (default 30)."""
        days = int(request.query_params.get("days", 30))
        threshold = date.today() + timedelta(days=days)
        qs = self.get_queryset().filter(
            expiry_date__isnull=False, expiry_date__lte=threshold
        )
        # Sertakan juga yang sudah kedaluwarsa tapi masih ada sisa stok.
        qs = qs | self.get_queryset().filter(expiry_date__lt=date.today())
        qs = qs.distinct()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Inventory.objects.select_related("product", "batch").all()
    serializer_class = InventorySerializer
    filterset_fields = ["product", "location"]
    search_fields = ["product__name", "location"]

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """Barang dengan stok di bawah ambang tertentu (default 5)."""
        threshold = int(request.query_params.get("threshold", 5))
        rows = (
            self.get_queryset()
            .values("product_id", "product__name")
            .annotate(total=Sum("quantity_available"))
            .filter(total__lte=threshold)
            .order_by("total")
        )
        return Response(rows)


class StockMovementFilter(FilterSet):
    date = DateFromToRangeFilter()

    class Meta:
        model = StockMovement
        fields = ["product", "movement_type", "reference_type"]


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related("product", "batch").all()
    serializer_class = StockMovementSerializer
    filterset_class = StockMovementFilter
    search_fields = ["product__name", "notes"]
    ordering_fields = ["date", "movement_id"]

    @action(detail=False, methods=["get"])
    def stock_card(self, request):
        """Kartu stok: mutasi per barang dalam rentang tanggal + saldo berjalan."""
        product_id = request.query_params.get("product")
        if not product_id:
            return Response(
                {"detail": "Parameter 'product' wajib diisi."}, status=400
            )

        qs = self.get_queryset().filter(product_id=product_id)
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        opening = 0
        if start:
            before = qs.filter(date__lt=start)
            ins = (
                before.filter(movement_type=StockMovement.MovementType.IN).aggregate(
                    v=Sum("quantity")
                )["v"]
                or 0
            )
            outs = (
                before.filter(movement_type=StockMovement.MovementType.OUT).aggregate(
                    v=Sum("quantity")
                )["v"]
                or 0
            )
            opening = ins - outs
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        qs = qs.order_by("date", "movement_id")

        balance = opening
        rows = []
        for m in qs:
            balance = (
                balance + m.quantity
                if m.movement_type == StockMovement.MovementType.IN
                else balance - m.quantity
            )
            data = self.get_serializer(m).data
            data["balance"] = balance
            rows.append(data)

        return Response(
            {
                "opening_balance": opening,
                "closing_balance": balance,
                "rows": rows,
            }
        )
