import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fetchAll, fmtIDR } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DashboardSummary, ProductBatch } from "../types";
import { ErrorNote, PageHeader, Spinner, StatCard, Badge } from "../components/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expiring, setExpiring] = useState<ProductBatch[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("dashboard/summary").then((r) => r.data as DashboardSummary),
      fetchAll<ProductBatch>("batches/expiring", { days: 30 }).catch(() => [] as ProductBatch[]),
    ])
      .then(([s, batches]) => {
        setSummary(s);
        setExpiring(
          batches
            .filter((b) => b.expiry_date)
            .sort((a, b) => (a.days_until_expiry ?? 999) - (b.days_until_expiry ?? 999))
            .slice(0, 8)
        );
      })
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan aktivitas toko & kesehatan stok."
      />
      <ErrorNote message={error} />

      {summary && (() => {
        const s = summary;
        const role = user?.role ?? s.role ?? "kasir";
        type Card = { icon: string; label: string; value: string; accent?: string };
        let cards: Card[];

        if (role === "admin") {
          cards = [
            { icon: "💰", label: "Total Penjualan", value: fmtIDR(s.total_revenue), accent: "text-green-600" },
            { icon: "🧾", label: "Total Pembelian", value: fmtIDR(s.total_purchase), accent: "text-red-500" },
            { icon: "📈", label: "Laba Kotor", value: fmtIDR(s.gross_profit), accent: "text-brand-600" },
            { icon: "🏬", label: "Nilai Inventori", value: fmtIDR(s.inventory_value), accent: "text-amber-500" },
            { icon: "🏷️", label: "Jumlah Barang", value: String(s.product_count) },
            { icon: "⏳", label: "Segera Kadaluarsa", value: String(s.expiring_soon), accent: "text-amber-500" },
            { icon: "🚫", label: "Sudah Kadaluarsa", value: String(s.expired), accent: "text-red-600" },
            { icon: "⚠️", label: "Stok Menipis", value: String(s.low_stock), accent: "text-orange-500" },
          ];
        } else if (role === "kasir") {
          cards = [
            { icon: "💰", label: "Penjualan Hari Ini", value: fmtIDR(s.today_revenue), accent: "text-green-600" },
            { icon: "🧾", label: "Transaksi Hari Ini", value: String(s.today_sales), accent: "text-brand-600" },
            { icon: "🏷️", label: "Jumlah Barang", value: String(s.product_count) },
            { icon: "⚠️", label: "Stok Menipis", value: String(s.low_stock), accent: "text-orange-500" },
            { icon: "⏳", label: "Segera Kadaluarsa", value: String(s.expiring_soon), accent: "text-amber-500" },
            { icon: "🚫", label: "Sudah Kadaluarsa", value: String(s.expired), accent: "text-red-600" },
          ];
        } else if (role === "gudang") {
          cards = [
            { icon: "🏬", label: "Nilai Inventori", value: fmtIDR(s.inventory_value), accent: "text-amber-500" },
            { icon: "🧾", label: "Total Pembelian", value: fmtIDR(s.total_purchase), accent: "text-red-500" },
            { icon: "🏷️", label: "Jumlah Barang", value: String(s.product_count) },
            { icon: "⚠️", label: "Stok Menipis", value: String(s.low_stock), accent: "text-orange-500" },
            { icon: "⏳", label: "Segera Kadaluarsa", value: String(s.expiring_soon), accent: "text-amber-500" },
            { icon: "🚫", label: "Sudah Kadaluarsa", value: String(s.expired), accent: "text-red-600" },
          ];
        } else {
          // akuntan
          cards = [
            { icon: "💰", label: "Total Penjualan", value: fmtIDR(s.total_revenue), accent: "text-green-600" },
            { icon: "🧾", label: "Total Pembelian", value: fmtIDR(s.total_purchase), accent: "text-red-500" },
            { icon: "📈", label: "Laba Kotor", value: fmtIDR(s.gross_profit), accent: "text-brand-600" },
            { icon: "🏬", label: "Nilai Inventori", value: fmtIDR(s.inventory_value), accent: "text-amber-500" },
            { icon: "🏷️", label: "Jumlah Barang", value: String(s.product_count) },
            { icon: "⚠️", label: "Stok Menipis", value: String(s.low_stock), accent: "text-orange-500" },
          ];
        }

        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((c, i) => (
              <StatCard
                key={i}
                icon={c.icon}
                label={c.label}
                value={c.value}
                accent={c.accent ?? "text-brand-600"}
              />
            ))}
          </div>
        );
      })()}

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold">Batch mendekati kadaluarsa (≤30 hari)</h3>
          <Link to="/batches" className="text-sm text-brand-600 hover:underline">
            Lihat semua
          </Link>
        </div>
        {expiring.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400">Tidak ada batch yang mendekati kadaluarsa. 🎉</p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Barang</th>
                <th className="th">Batch</th>
                <th className="th">Kadaluarsa</th>
                <th className="th">Sisa</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((b) => (
                <tr key={b.batch_id} className="border-t border-slate-100">
                  <td className="td font-medium">{b.product_name}</td>
                  <td className="td">{b.batch_code || "-"}</td>
                  <td className="td">{b.expiry_date}</td>
                  <td className="td">{b.remaining}</td>
                  <td className="td">
                    {b.is_expired ? (
                      <Badge tone="red">Kadaluarsa</Badge>
                    ) : (b.days_until_expiry ?? 0) <= 7 ? (
                      <Badge tone="red">{(b.days_until_expiry ?? 0)} hari lagi</Badge>
                    ) : (
                      <Badge tone="amber">{(b.days_until_expiry ?? 0)} hari lagi</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
