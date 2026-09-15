from django.db import models


class Category(models.Model):
    """Kategori barang (makanan, minuman, elektronik, dsb)."""

    category_id = models.AutoField(primary_key=True)
    name = models.CharField("Nama kategori", max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kategori"
        verbose_name_plural = "Kategori"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    """Barang. `has_expiry` menentukan apakah barang dipantau per batch."""

    product_id = models.AutoField(primary_key=True)
    name = models.CharField("Nama barang", max_length=200)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    sku = models.CharField("SKU", max_length=64, unique=True)
    price = models.DecimalField("Harga jual", max_digits=15, decimal_places=2)
    cost = models.DecimalField("Harga beli", max_digits=15, decimal_places=2)
    has_expiry = models.BooleanField("Punya kadaluarsa", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Barang"
        verbose_name_plural = "Barang"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku})"


class ProductBatch(models.Model):
    """Batch barang, dipakai untuk barang yang punya tanggal kadaluarsa."""

    batch_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="batches"
    )
    batch_code = models.CharField("Kode batch", max_length=100, blank=True)
    expiry_date = models.DateField("Tanggal kadaluarsa", null=True, blank=True)
    quantity = models.PositiveIntegerField("Jumlah stok dalam batch", default=0)
    received_date = models.DateField("Tanggal barang masuk")

    class Meta:
        verbose_name = "Batch Barang"
        verbose_name_plural = "Batch Barang"
        ordering = ["expiry_date", "received_date"]

    def __str__(self):
        return f"{self.product.name} - {self.batch_code or self.batch_id}"


class Inventory(models.Model):
    """Posisi stok per barang (dan per batch bila ada)."""

    inventory_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="inventory_rows"
    )
    batch = models.ForeignKey(
        ProductBatch,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="inventory_rows",
    )
    quantity_available = models.PositiveIntegerField(
        "Jumlah stok tersedia", default=0
    )
    location = models.CharField("Lokasi penyimpanan", max_length=100, blank=True)

    class Meta:
        verbose_name = "Stok"
        verbose_name_plural = "Stok"
        ordering = ["product__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "batch"],
                name="unique_inventory_product_batch",
            )
        ]

    def __str__(self):
        batch = f" batch={self.batch_id}" if self.batch_id else ""
        return f"{self.product.name}{batch} @ {self.location or '-'}"


class StockMovement(models.Model):
    """Riwayat mutasi stok (keluar/masuk) per barang & batch."""

    class MovementType(models.TextChoices):
        IN = "in", "Masuk"
        OUT = "out", "Keluar"

    class ReferenceType(models.TextChoices):
        SALE = "sale", "Penjualan"
        PURCHASE = "purchase", "Pembelian"
        INITIAL = "initial", "Stok Awal"
        ADJUSTMENT = "adjustment", "Penyesuaian"
        CANCEL = "cancel", "Pembatalan"

    movement_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="stock_movements"
    )
    batch = models.ForeignKey(
        ProductBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    movement_type = models.CharField(
        "Tipe mutasi", max_length=10, choices=MovementType.choices
    )
    quantity = models.PositiveIntegerField("Jumlah")
    date = models.DateField("Tanggal")
    reference_type = models.CharField(
        "Tipe referensi", max_length=20, choices=ReferenceType.choices,
        default=ReferenceType.INITIAL,
    )
    reference_id = models.PositiveIntegerField("ID referensi", null=True, blank=True)
    notes = models.CharField("Catatan", max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Mutasi Stok"
        verbose_name_plural = "Mutasi Stok"
        ordering = ["-date", "-movement_id"]

    def __str__(self):
        direction = "+" if self.movement_type == self.MovementType.IN else "-"
        return f"{self.date} {direction}{self.quantity} {self.product.name}"
