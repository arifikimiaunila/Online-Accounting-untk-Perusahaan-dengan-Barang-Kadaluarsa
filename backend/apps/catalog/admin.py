from django.contrib import admin

from .models import Category, Inventory, Product, ProductBatch, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("category_id", "name")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_id", "name", "sku", "category", "price", "cost", "has_expiry")
    list_filter = ("has_expiry", "category")
    search_fields = ("name", "sku")


@admin.register(ProductBatch)
class ProductBatchAdmin(admin.ModelAdmin):
    list_display = ("batch_id", "product", "batch_code", "expiry_date", "quantity", "received_date")
    list_filter = ("product",)
    search_fields = ("batch_code", "product__name")


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("inventory_id", "product", "batch", "quantity_available", "location")
    list_filter = ("product",)
    search_fields = ("product__name", "location")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "movement_id",
        "date",
        "product",
        "batch",
        "movement_type",
        "quantity",
        "reference_type",
        "reference_id",
    )
    list_filter = ("movement_type", "reference_type", "date")
    search_fields = ("product__name", "notes")
