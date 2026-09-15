"""Seed data demo: kategori, barang (dengan & tanpa kadaluarsa), pelanggan, supplier.

Jalankan:  python manage.py seed_demo
"""
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounting.services import ensure_default_accounts
from apps.catalog.models import Category, Product, StockMovement
from apps.catalog.services import StockLine, add_stock
from apps.parties.models import Customer, Supplier


class Command(BaseCommand):
    help = "Mengisi data demo (kategori, barang, pelanggan, pemasok, stok awal)."

    @transaction.atomic
    def handle(self, *args, **options):
        ensure_default_accounts()

        makanan, _ = Category.objects.get_or_create(name="Makanan")
        minuman, _ = Category.objects.get_or_create(name="Minuman")
        elektronik, _ = Category.objects.get_or_create(name="Elektronik")

        today = date.today()

        products = [
            # Barang dengan kadaluarsa
            dict(name="Susu UHT 1L", category=makanan, sku="MKN-001", price=22000, cost=18000, has_expiry=True),
            dict(name="Roti Tawar", category=makanan, sku="MKN-002", price=15000, cost=11000, has_expiry=True),
            dict(name="Yogurt 250ml", category=makanan, sku="MKN-003", price=9000, cost=6500, has_expiry=True),
            dict(name="Air Mineral 600ml", category=minuman, sku="MNM-001", price=4000, cost=2500, has_expiry=True),
            dict(name="Teh Botol 350ml", category=minuman, sku="MNM-002", price=6000, cost=4200, has_expiry=True),
            # Barang tanpa kadaluarsa
            dict(name="Kabel USB-C 1m", category=elektronik, sku="ELK-001", price=45000, cost=30000, has_expiry=False),
            dict(name="Adaptor Charger 20W", category=elektronik, sku="ELK-002", price=120000, cost=90000, has_expiry=False),
            dict(name="Mouse Wireless", category=elektronik, sku="ELK-003", price=95000, cost=70000, has_expiry=False),
        ]

        for p in products:
            obj, created = Product.objects.get_or_create(sku=p["sku"], defaults=p)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Barang dibuat: {obj.name}"))

        # Stok awal (hanya diisi sekali; lewati bila sudah pernah di-seed)
        if StockMovement.objects.filter(
            reference_type=StockMovement.ReferenceType.INITIAL
        ).exists():
            self.stdout.write(self.style.WARNING("Stok awal sudah ada, dilewati."))
        else:
            milk = Product.objects.get(sku="MKN-001")
            add_stock(StockLine(product_id=milk.product_id, quantity=24, batch_code="B-001",
                                expiry_date=today + timedelta(days=90), received_date=today))
            add_stock(StockLine(product_id=milk.product_id, quantity=12, batch_code="B-002",
                                expiry_date=today + timedelta(days=20), received_date=today))

            bread = Product.objects.get(sku="MKN-002")
            add_stock(StockLine(product_id=bread.product_id, quantity=30, batch_code="B-101",
                                expiry_date=today + timedelta(days=7), received_date=today))

            yogurt = Product.objects.get(sku="MKN-003")
            add_stock(StockLine(product_id=yogurt.product_id, quantity=40, batch_code="B-201",
                                expiry_date=today + timedelta(days=15), received_date=today))

            for sku, qty in [("MNM-001", 100), ("MNM-002", 60), ("ELK-001", 20), ("ELK-002", 10), ("ELK-003", 15)]:
                prod = Product.objects.get(sku=sku)
                add_stock(StockLine(product_id=prod.product_id, quantity=qty, received_date=today))

        Customer.objects.get_or_create(name="Pelanggan Umum", defaults={"contact_info": "-"})
        Customer.objects.get_or_create(name="Budi Santoso", defaults={"contact_info": "0812-3456-7890"})
        Supplier.objects.get_or_create(name="PT Sumber Makmur", defaults={"contact_info": "021-555-1234"})
        Supplier.objects.get_or_create(name="CV Elektronik Jaya", defaults={"contact_info": "021-555-5678"})

        self.stdout.write(self.style.SUCCESS("Data demo berhasil dibuat."))
