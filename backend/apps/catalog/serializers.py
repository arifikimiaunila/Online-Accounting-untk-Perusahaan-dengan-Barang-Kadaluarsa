from rest_framework import serializers

from .models import Category, Inventory, Product, ProductBatch, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["category_id", "name", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )
    available_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "product_id",
            "name",
            "category",
            "category_name",
            "sku",
            "price",
            "cost",
            "has_expiry",
            "available_stock",
            "created_at",
            "updated_at",
        ]

    def get_available_stock(self, obj):
        from .services import get_available

        return get_available(obj.product_id)


class ProductBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()

    class Meta:
        model = ProductBatch
        fields = [
            "batch_id",
            "product",
            "product_name",
            "batch_code",
            "expiry_date",
            "quantity",
            "remaining",
            "is_expired",
            "days_until_expiry",
            "received_date",
        ]

    def get_remaining(self, obj):
        from django.db.models import Sum

        val = obj.inventory_rows.aggregate(v=Sum("quantity_available"))["v"]
        return int(val or 0)

    def get_is_expired(self, obj):
        from datetime import date

        return bool(obj.expiry_date and obj.expiry_date < date.today())

    def get_days_until_expiry(self, obj):
        from datetime import date

        if not obj.expiry_date:
            return None
        return (obj.expiry_date - date.today()).days


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    batch_code = serializers.CharField(source="batch.batch_code", read_only=True)
    expiry_date = serializers.DateField(source="batch.expiry_date", read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "inventory_id",
            "product",
            "product_name",
            "batch",
            "batch_code",
            "expiry_date",
            "quantity_available",
            "location",
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    batch_code = serializers.CharField(source="batch.batch_code", read_only=True)
    movement_type_label = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )
    reference_type_label = serializers.CharField(
        source="get_reference_type_display", read_only=True
    )

    class Meta:
        model = StockMovement
        fields = [
            "movement_id",
            "product",
            "product_name",
            "batch",
            "batch_code",
            "movement_type",
            "movement_type_label",
            "quantity",
            "date",
            "reference_type",
            "reference_type_label",
            "reference_id",
            "notes",
            "created_at",
        ]
