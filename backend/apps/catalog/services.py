"""Logika bisnis pergerakan stok.

- Barang dengan `has_expiry=True`  -> stok dipantau per batch (FEFO: First Expired, First Out).
- Barang dengan `has_expiry=False` -> stok digabung tanpa batch (FIFO tidak perlu, cukup kurangi).
"""
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.db.models import Sum

from .models import Inventory, Product, ProductBatch, StockMovement


class InsufficientStockError(Exception):
    """Dilempar ketika stok tidak mencukupi."""


@dataclass
class StockLine:
    """Satu baris pergerakan stok (untuk pembelian / penjualan)."""

    product_id: int
    quantity: int
    batch_id: Optional[int] = None
    batch_code: str = ""
    expiry_date: Optional[date] = None
    received_date: Optional[date] = None
    cost: Optional[Decimal] = None


@dataclass
class Allocation:
    """Hasil alokasi pengurangan stok per batch."""

    batch_id: Optional[int]
    quantity: int


@dataclass
class BatchOutcome:
    batch: Optional[ProductBatch]
    used: int


def get_available(product_id: int) -> int:
    """Total stok tersedia untuk suatu barang."""
    total = Inventory.objects.filter(product_id=product_id).aggregate(
        v=Sum("quantity_available")
    )["v"]
    return int(total or 0)


@transaction.atomic
def add_stock(
    line: StockLine,
    *,
    tx_date: Optional[date] = None,
    reference_type: str = StockMovement.ReferenceType.INITIAL,
    reference_id: Optional[int] = None,
    notes: str = "",
) -> Optional[ProductBatch]:
    """Menambah stok (dipakai saat pembelian / pembatalan penjualan)."""
    product = Product.objects.get(product_id=line.product_id)
    movement_date = tx_date or line.received_date or date.today()

    batch = None
    if product.has_expiry:
        if line.batch_id:
            # Pulihkan stok ke batch yang sudah ada (mis. pembatalan penjualan).
            batch = ProductBatch.objects.filter(
                batch_id=line.batch_id, product=product
            ).first()
        if batch is None:
            batch = ProductBatch.objects.create(
                product=product,
                batch_code=line.batch_code,
                expiry_date=line.expiry_date,
                quantity=line.quantity,
                received_date=line.received_date or movement_date,
            )

    # Barang non-expiry boleh tetap memakai lokasi kosong; satu baris inventory per produk.
    inv, _ = Inventory.objects.get_or_create(
        product=product,
        batch=batch,
        defaults={"quantity_available": 0, "location": ""},
    )
    inv.quantity_available += line.quantity
    inv.save(update_fields=["quantity_available"])

    StockMovement.objects.create(
        product=product,
        batch=batch,
        movement_type=StockMovement.MovementType.IN,
        quantity=line.quantity,
        date=movement_date,
        reference_type=reference_type,
        reference_id=reference_id,
        notes=notes,
    )
    return batch


@transaction.atomic
def deduct_stock(
    line: StockLine,
    location: str = "",
    *,
    tx_date: Optional[date] = None,
    reference_type: str = StockMovement.ReferenceType.SALE,
    reference_id: Optional[int] = None,
    notes: str = "",
) -> list[BatchOutcome]:
    """Mengurangi stok (dipakai saat penjualan).

    Barang kadaluarsa: FEFO (batch dengan tanggal kedaluwarsa paling awal dulu).
    Barang tanpa kadaluarsa: kurangi baris inventory tunggal.
    """
    product = Product.objects.get(product_id=line.product_id)
    if line.quantity <= 0:
        return []

    movement_date = tx_date or date.today()

    if product.has_expiry:
        return _deduct_expiry(
            product, line.quantity, location,
            movement_date, reference_type, reference_id, notes,
        )

    inv = Inventory.objects.filter(product=product, batch__isnull=True).first()
    if inv is None or inv.quantity_available < line.quantity:
        raise InsufficientStockError(
            f"Stok '{product.name}' tidak mencukupi. Tersedia: "
            f"{inv.quantity_available if inv else 0}, dibutuhkan: {line.quantity}"
        )
    inv.quantity_available -= line.quantity
    inv.save(update_fields=["quantity_available"])

    StockMovement.objects.create(
        product=product,
        batch=None,
        movement_type=StockMovement.MovementType.OUT,
        quantity=line.quantity,
        date=movement_date,
        reference_type=reference_type,
        reference_id=reference_id,
        notes=notes,
    )
    return [BatchOutcome(batch=None, used=line.quantity)]


def _deduct_expiry(
    product: Product,
    quantity: int,
    location: str,
    movement_date: date,
    reference_type: str,
    reference_id: Optional[int],
    notes: str,
) -> list[BatchOutcome]:
    # Batch yang belum kedaluwarsa (atau semua jika tak ada tanggal) urut FEFO.
    batches = list(
        Inventory.objects.filter(product=product, quantity_available__gt=0)
        .select_related("batch")
        .order_by("batch__expiry_date", "batch__received_date", "batch_id")
    )

    remaining = quantity
    outcomes: list[BatchOutcome] = []
    for inv in batches:
        if remaining <= 0:
            break
        take = min(inv.quantity_available, remaining)
        inv.quantity_available -= take
        inv.save(update_fields=["quantity_available"])
        StockMovement.objects.create(
            product=product,
            batch=inv.batch,
            movement_type=StockMovement.MovementType.OUT,
            quantity=take,
            date=movement_date,
            reference_type=reference_type,
            reference_id=reference_id,
            notes=notes,
        )
        outcomes.append(BatchOutcome(batch=inv.batch, used=take))
        remaining -= take

    if remaining > 0:
        raise InsufficientStockError(
            f"Stok '{product.name}' tidak mencukupi. Kekurangan: {remaining}"
        )
    return outcomes


def current_valuation() -> Decimal:
    """Nilai inventori saat ini (qty tersedia x harga beli)."""
    total = Decimal("0")
    for inv in Inventory.objects.select_related("product").filter(
        quantity_available__gt=0
    ):
        total += Decimal(inv.quantity_available) * inv.product.cost
    return total
