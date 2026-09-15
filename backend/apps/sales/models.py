from django.db import models

from apps.catalog.models import Product, ProductBatch
from apps.parties.models import Customer


class Sale(models.Model):
    """Penjualan (transaksi keluar)."""

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        TRANSFER = "transfer", "Transfer"
        EWALLET = "e-wallet", "E-Wallet"

    sale_id = models.AutoField(primary_key=True)
    date = models.DateField("Tanggal transaksi")
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    total_amount = models.DecimalField(
        "Total nilai penjualan", max_digits=15, decimal_places=2, default=0
    )
    payment_method = models.CharField(
        "Metode pembayaran",
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Penjualan"
        verbose_name_plural = "Penjualan"
        ordering = ["-date", "-sale_id"]

    def __str__(self):
        return f"Sale #{self.sale_id} - {self.date}"


class SaleItem(models.Model):
    """Detail penjualan."""

    sale_item_id = models.AutoField(primary_key=True)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="sale_items"
    )
    batch = models.ForeignKey(
        ProductBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_items",
    )
    quantity = models.PositiveIntegerField("Jumlah terjual")
    price = models.DecimalField("Harga per unit", max_digits=15, decimal_places=2)
    subtotal = models.DecimalField(
        "Total harga item", max_digits=15, decimal_places=2, default=0
    )

    class Meta:
        verbose_name = "Detail Penjualan"
        verbose_name_plural = "Detail Penjualan"
        ordering = ["sale_item_id"]

    def save(self, *args, **kwargs):
        if not self.subtotal:
            self.subtotal = self.price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"
