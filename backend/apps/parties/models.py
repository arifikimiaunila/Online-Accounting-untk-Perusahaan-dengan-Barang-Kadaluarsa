from django.db import models


class Customer(models.Model):
    """Pelanggan."""

    customer_id = models.AutoField(primary_key=True)
    name = models.CharField("Nama", max_length=200)
    contact_info = models.CharField("Kontak", max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pelanggan"
        verbose_name_plural = "Pelanggan"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Supplier(models.Model):
    """Pemasok (supplier)."""

    supplier_id = models.AutoField(primary_key=True)
    name = models.CharField("Nama", max_length=200)
    contact_info = models.CharField("Kontak", max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pemasok"
        verbose_name_plural = "Pemasok"
        ordering = ["name"]

    def __str__(self):
        return self.name
