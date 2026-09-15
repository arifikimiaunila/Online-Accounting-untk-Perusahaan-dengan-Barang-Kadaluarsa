"""Ekspor laporan ke CSV / PDF."""
import csv
from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.http import HttpResponse
from rest_framework.views import APIView

from apps.accounting.models import JournalEntry
from apps.catalog.models import StockMovement
from apps.purchases.models import Purchase
from apps.sales.models import Sale


# ---------------------------------------------------------------- helpers
def csv_response(filename: str, headers: list, rows: list) -> HttpResponse:
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.write("\ufeff")  # BOM agar terbaca rapi di Excel
    writer = csv.writer(response)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return response


def pdf_response(
    filename: str, title: str, headers: list, rows: list, landscape: bool = False
) -> HttpResponse:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape as landscape_page
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    page = landscape_page(A4) if landscape else A4
    doc = SimpleDocTemplate(
        response, pagesize=page, topMargin=15 * mm, bottomMargin=15 * mm,
        leftMargin=12 * mm, rightMargin=12 * mm,
    )
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"]), Spacer(1, 6 * mm)]

    data = [headers] + rows
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f1f5f9")],
                ),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)
    return response


def _fmt(value: Decimal) -> str:
    return f"{value:,.2f}"


def _allowed_role(request, roles):
    if request.user.is_superuser:
        return True
    role = getattr(getattr(request.user, "profile", None), "role", None)
    return role == "admin" or role in roles


# ---------------------------------------------------------------- views
class SalesReportView(APIView):
    def get(self, request):
        start = request.query_params.get("date_after")
        end = request.query_params.get("date_before")
        qs = Sale.objects.select_related("customer").order_by("date", "sale_id")
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        headers = ["No", "Tanggal", "Pelanggan", "Metode", "Total"]
        rows = [
            [
                s.sale_id,
                str(s.date),
                s.customer.name if s.customer else "-",
                s.get_payment_method_display(),
                _fmt(s.total_amount),
            ]
            for s in qs
        ]
        total = qs.aggregate(v=Sum("total_amount"))["v"] or Decimal("0")
        rows.append(["", "", "", "TOTAL", _fmt(total)])

        title = f"Laporan Penjualan ({start or '-'} s/d {end or '-'})"
        return self._emit(request, "laporan-penjualan", title, headers, rows, True)

    def _emit(self, request, base, title, headers, rows, landscape):
        if request.query_params.get("format", "csv").lower() == "pdf":
            return pdf_response(f"{base}.pdf", title, headers, rows, landscape)
        return csv_response(f"{base}.csv", headers, rows)


class PurchaseReportView(APIView):
    def get(self, request):
        start = request.query_params.get("date_after")
        end = request.query_params.get("date_before")
        qs = Purchase.objects.select_related("supplier").order_by("date", "purchase_id")
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        headers = ["No", "Tanggal", "Pemasok", "Total"]
        rows = [
            [
                p.purchase_id,
                str(p.date),
                p.supplier.name if p.supplier else "-",
                _fmt(p.total_amount),
            ]
            for p in qs
        ]
        total = qs.aggregate(v=Sum("total_amount"))["v"] or Decimal("0")
        rows.append(["", "", "TOTAL", _fmt(total)])

        title = f"Laporan Pembelian ({start or '-'} s/d {end or '-'})"
        if request.query_params.get("format", "csv").lower() == "pdf":
            return pdf_response("laporan-pembelian.pdf", title, headers, rows, True)
        return csv_response("laporan-pembelian.csv", headers, rows)


class ProfitLossView(APIView):
    def get(self, request):
        if not _allowed_role(request, ["akuntan"]):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Hanya Admin/Akuntan yang dapat mengakses laporan ini.")

        revenue = (
            JournalEntry.objects.filter(account__account_type="revenue").aggregate(
                v=Sum("credit")
            )["v"]
            or Decimal("0")
        )
        expense = (
            JournalEntry.objects.filter(account__account_type="expense").aggregate(
                v=Sum("debit")
            )["v"]
            or Decimal("0")
        )
        headers = ["Keterangan", "Nilai (Rp)"]
        rows = [
            ["Pendapatan", _fmt(revenue)],
            ["Beban", _fmt(expense)],
            ["Laba Bersih", _fmt(revenue - expense)],
        ]
        title = "Laporan Laba / Rugi"
        if request.query_params.get("format", "csv").lower() == "pdf":
            return pdf_response("laba-rugi.pdf", title, headers, rows)
        return csv_response("laba-rugi.csv", headers, rows)


class TrialBalanceView(APIView):
    def get(self, request):
        if not _allowed_role(request, ["akuntan"]):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Hanya Admin/Akuntan yang dapat mengakses laporan ini.")

        rows = (
            JournalEntry.objects.values("account__code", "account__name")
            .annotate(debit=Sum("debit"), credit=Sum("credit"))
            .order_by("account__code")
        )
        headers = ["Kode", "Akun", "Debit (Rp)", "Kredit (Rp)"]
        data = [
            [
                r["account__code"],
                r["account__name"],
                _fmt(r["debit"] or Decimal("0")),
                _fmt(r["credit"] or Decimal("0")),
            ]
            for r in rows
        ]
        title = "Neraca Saldo"
        if request.query_params.get("format", "csv").lower() == "pdf":
            return pdf_response("neraca-saldo.pdf", title, headers, data)
        return csv_response("neraca-saldo.csv", headers, data)


class StockCardExportView(APIView):
    def get(self, request):
        product_id = request.query_params.get("product")
        if not product_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"detail": "Parameter 'product' wajib diisi."})

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        qs = StockMovement.objects.select_related("product", "batch").filter(
            product_id=product_id
        )

        opening = 0
        if start:
            before = qs.filter(date__lt=start)
            ins = (
                before.filter(movement_type=StockMovement.MovementType.IN).aggregate(
                    v=Sum("quantity")
                )["v"]
                or 0
            )
            outs = (
                before.filter(movement_type=StockMovement.MovementType.OUT).aggregate(
                    v=Sum("quantity")
                )["v"]
                or 0
            )
            opening = ins - outs
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        qs = qs.order_by("date", "movement_id")
        product_name = qs.first().product.name if qs.exists() else "-"

        headers = ["Tanggal", "Tipe", "Batch", "Masuk", "Keluar", "Saldo", "Referensi"]
        balance = opening
        rows = []
        for m in qs:
            balance = (
                balance + m.quantity
                if m.movement_type == StockMovement.MovementType.IN
                else balance - m.quantity
            )
            rows.append(
                [
                    str(m.date),
                    m.get_movement_type_display(),
                    m.batch.batch_code if m.batch else "-",
                    m.quantity if m.movement_type == StockMovement.MovementType.IN else "",
                    m.quantity if m.movement_type == StockMovement.MovementType.OUT else "",
                    balance,
                    f"{m.get_reference_type_display()} #{m.reference_id}" if m.reference_id else m.get_reference_type_display(),
                ]
            )

        title = f"Kartu Stok: {product_name} (saldo awal {opening})"
        if request.query_params.get("format", "csv").lower() == "pdf":
            return pdf_response("kartu-stok.pdf", title, headers, rows, True)
        return csv_response("kartu-stok.csv", headers, rows)
