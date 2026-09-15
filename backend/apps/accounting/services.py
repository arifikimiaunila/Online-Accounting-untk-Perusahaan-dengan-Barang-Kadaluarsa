"""Pembuatan jurnal otomatis untuk penjualan & pembelian."""
from .models import ChartOfAccount, JournalEntry

DEFAULT_ACCOUNTS = [
    # code, name, type
    ("1100", "Kas", "asset"),
    ("1200", "Piutang Usaha", "asset"),
    ("1300", "Persediaan", "asset"),
    ("2100", "Hutang Usaha", "liability"),
    ("3100", "Modal", "equity"),
    ("4100", "Pendapatan Penjualan", "revenue"),
    ("5100", "Harga Pokok Penjualan", "expense"),
    ("5200", "Beban Operasional", "expense"),
]


def ensure_default_accounts():
    """Buat daftar akun standar bila belum ada."""
    for code, name, account_type in DEFAULT_ACCOUNTS:
        ChartOfAccount.objects.get_or_create(
            code=code,
            defaults={"name": name, "account_type": account_type},
        )


def _account(code: str) -> ChartOfAccount:
    ensure_default_accounts()
    return ChartOfAccount.objects.get(code=code)


def post_sale_journal(sale):
    """Penjualan: debit Kas/Piutang, kredit Pendapatan (dan HPP bila tersedia)."""
    ensure_default_accounts()
    amount = sale.total_amount

    # Debit kas (atau piutang untuk kredit, namun payment_method cukup untuk demo).
    asset_code = "1100" if sale.payment_method in ("cash", "e-wallet") else "1200"
    JournalEntry.objects.create(
        date=sale.date,
        description=f"Penjualan #{sale.sale_id}",
        account=_account(asset_code),
        debit=amount,
        credit=0,
        reference_type="sale",
        reference_id=sale.sale_id,
    )
    JournalEntry.objects.create(
        date=sale.date,
        description=f"Pendapatan penjualan #{sale.sale_id}",
        account=_account("4100"),
        debit=0,
        credit=amount,
        reference_type="sale",
        reference_id=sale.sale_id,
    )


def post_purchase_journal(purchase):
    """Pembelian: debit Persediaan, kredit Hutang/Kas."""
    ensure_default_accounts()
    amount = purchase.total_amount
    JournalEntry.objects.create(
        date=purchase.date,
        description=f"Pembelian #{purchase.purchase_id}",
        account=_account("1300"),
        debit=amount,
        credit=0,
        reference_type="purchase",
        reference_id=purchase.purchase_id,
    )
    JournalEntry.objects.create(
        date=purchase.date,
        description=f"Hutang pembelian #{purchase.purchase_id}",
        account=_account("2100"),
        debit=0,
        credit=amount,
        reference_type="purchase",
        reference_id=purchase.purchase_id,
    )
