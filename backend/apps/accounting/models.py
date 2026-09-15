from django.db import models
from django.db.models import Sum


class ChartOfAccount(models.Model):
    """Daftar akun sederhana (kode & nama akun)."""

    account_id = models.AutoField(primary_key=True)
    code = models.CharField("Kode akun", max_length=20, unique=True)
    name = models.CharField("Nama akun", max_length=200)
    account_type = models.CharField(
        "Tipe akun",
        max_length=20,
        choices=[
            ("asset", "Aset"),
            ("liability", "Kewajiban"),
            ("equity", "Ekuitas"),
            ("revenue", "Pendapatan"),
            ("expense", "Beban"),
        ],
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Daftar Akun"
        verbose_name_plural = "Daftar Akun"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class JournalEntry(models.Model):
    """Jurnal akuntansi formal (debit/kredit)."""

    journal_entry_id = models.AutoField(primary_key=True)
    date = models.DateField("Tanggal jurnal")
    description = models.CharField("Keterangan", max_length=255)
    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="entries",
    )
    debit = models.DecimalField("Debit", max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField("Kredit", max_digits=15, decimal_places=2, default=0)

    # Referensi ke transaksi asal (penjualan / pembelian), opsional.
    reference_type = models.CharField(
        "Tipe referensi", max_length=20, blank=True,
        choices=[("sale", "Penjualan"), ("purchase", "Pembelian"), ("manual", "Manual")],
        default="manual",
    )
    reference_id = models.PositiveIntegerField("ID referensi", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Jurnal"
        verbose_name_plural = "Jurnal"
        ordering = ["-date", "-journal_entry_id"]

    def __str__(self):
        return f"{self.date} - {self.description}"

    @classmethod
    def total_debit(cls):
        return cls.objects.aggregate(v=Sum("debit"))["v"] or 0

    @classmethod
    def total_credit(cls):
        return cls.objects.aggregate(v=Sum("credit"))["v"] or 0
