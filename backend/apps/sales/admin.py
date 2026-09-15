from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("sale_id", "date", "customer", "total_amount", "payment_method")
    list_filter = ("payment_method", "date")
    inlines = [SaleItemInline]
