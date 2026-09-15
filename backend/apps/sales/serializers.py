from datetime import date
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import Product, ProductBatch
from apps.catalog.services import InsufficientStockError, StockLine, deduct_stock

from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    batch = serializers.PrimaryKeyRelatedField(
        queryset=ProductBatch.objects.all(), required=False, allow_null=True
    )
    batch_code = serializers.CharField(source="batch.batch_code", read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "sale_item_id",
            "sale",
            "product",
            "product_name",
            "batch",
            "batch_code",
            "quantity",
            "price",
            "subtotal",
        ]
        extra_kwargs = {"sale": {"required": False}}


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "sale_id",
            "date",
            "customer",
            "customer_name",
            "total_amount",
            "payment_method",
            "items",
            "created_at",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        if not items_data:
            raise serializers.ValidationError({"items": "Minimal satu item."})

        with transaction.atomic():
            sale = Sale.objects.create(total_amount=0, **validated_data)
            total = Decimal("0")

            for item_data in items_data:
                product = item_data["product"]
                qty = item_data["quantity"]
                price = item_data.get("price") or product.price

                # Kurangi stok (FEFO untuk barang kadaluarsa).
                try:
                    outcomes = deduct_stock(
                        StockLine(product_id=product.product_id, quantity=qty),
                        tx_date=sale.date,
                        reference_type="sale",
                        reference_id=sale.sale_id,
                        notes=f"Penjualan #{sale.sale_id}",
                    )
                except InsufficientStockError as exc:
                    raise serializers.ValidationError({"items": str(exc)})

                # Buat item per alokasi batch agar `batch` tercatat benar.
                for outcome in outcomes:
                    used = outcome.used
                    if used <= 0:
                        continue
                    subtotal = price * used
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        batch=outcome.batch,
                        quantity=used,
                        price=price,
                        subtotal=subtotal,
                    )
                    total += subtotal

            sale.total_amount = total
            sale.save(update_fields=["total_amount"])

            # Catat jurnal (pendapatan vs kas/piutang).
            from apps.accounting.services import post_sale_journal

            post_sale_journal(sale)
            return sale

    def update(self, instance, validated_data):
        raise serializers.ValidationError(
            "Penjualan tidak dapat diubah. Hapus dan buat ulang bila perlu."
        )
