from datetime import date
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import Product, ProductBatch
from apps.catalog.services import StockLine, add_stock

from .models import Purchase, PurchaseItem


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    batch = serializers.PrimaryKeyRelatedField(
        queryset=ProductBatch.objects.all(), required=False, allow_null=True
    )
    # Output: kode batch dari batch terkait.
    batch_code = serializers.CharField(source="batch.batch_code", read_only=True)
    # Input: untuk membuat batch baru pada barang kadaluarsa.
    new_batch_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_expiry_date = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = PurchaseItem
        fields = [
            "purchase_item_id",
            "purchase",
            "product",
            "product_name",
            "batch",
            "batch_code",
            "new_batch_code",
            "new_expiry_date",
            "quantity",
            "cost",
        ]
        extra_kwargs = {"purchase": {"required": False}}


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = Purchase
        fields = [
            "purchase_id",
            "supplier",
            "supplier_name",
            "date",
            "total_amount",
            "items",
            "created_at",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        if not items_data:
            raise serializers.ValidationError({"items": "Minimal satu item."})

        with transaction.atomic():
            purchase = Purchase.objects.create(total_amount=0, **validated_data)
            total = Decimal("0")

            for item_data in items_data:
                product = item_data["product"]
                qty = item_data["quantity"]
                cost = item_data.get("cost") or product.cost

                batch = add_stock(
                    StockLine(
                        product_id=product.product_id,
                        quantity=qty,
                        batch_code=item_data.get("new_batch_code", ""),
                        expiry_date=item_data.get("new_expiry_date"),
                        received_date=purchase.date or date.today(),
                    ),
                    tx_date=purchase.date,
                    reference_type="purchase",
                    reference_id=purchase.purchase_id,
                    notes=f"Pembelian #{purchase.purchase_id}",
                )

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product=product,
                    batch=batch,
                    quantity=qty,
                    cost=cost,
                )
                total += cost * qty

            purchase.total_amount = total
            purchase.save(update_fields=["total_amount"])

            from apps.accounting.services import post_purchase_journal

            post_purchase_journal(purchase)
            return purchase

    def update(self, instance, validated_data):
        raise serializers.ValidationError(
            "Pembelian tidak dapat diubah. Hapus dan buat ulang bila perlu."
        )
