from django.db import models

from apps.catalog.models import Product, ProductBatch
from apps.parties.models import Supplier


class Purchase(models.Model):
    """Pembelian dari supplier (transaksi masuk)."""

    purchase_id = models.AutoField(primary_key=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchases",
    )
    date = models.DateField("Tanggal pembelian")
    total_amount = models.DecimalField(
        "Total nilai pembelian", max_digits=15, decimal_places=2, default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pembelian"
        verbose_name_plural = "Pembelian"
        ordering = ["-date", "-purchase_id"]

    def __str__(self):
        return f"Purchase #{self.purchase_id} - {self.date}"


class PurchaseItem(models.Model):
    """Detail pembelian."""

    purchase_item_id = models.AutoField(primary_key=True)
    purchase = models.ForeignKey(
        Purchase, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="purchase_items"
    )
    batch = models.ForeignKey(
        ProductBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_items",
    )
    quantity = models.PositiveIntegerField("Jumlah dibeli")
    cost = models.DecimalField("Harga beli per unit", max_digits=15, decimal_places=2)

    class Meta:
        verbose_name = "Detail Pembelian"
        verbose_name_plural = "Detail Pembelian"
        ordering = ["purchase_item_id"]

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"
