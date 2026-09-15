import { useEffect, useMemo, useState } from "react";
import { fetchAll } from "../api/client";
import { ProductBatch } from "../types";
import { Badge, EmptyState, ErrorNote, PageHeader, Spinner } from "../components/ui";

export default function Batches() {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "expiring" | "expired">("all");

  useEffect(() => {
    fetchAll<ProductBatch>("batches")
      .then(setBatches)
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat batch."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "expired") return batches.filter((b) => b.is_expired);
    if (filter === "expiring")
      return batches.filter((b) => b.expiry_date && !b.is_expired && (b.days_until_expiry ?? 999) <= 30);
    return batches;
  }, [batches, filter]);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Batch & Kadaluarsa"
        subtitle="Pantau stok per batch untuk barang yang memiliki tanggal kadaluarsa."
      />
      <ErrorNote message={error} />

      <div className="flex gap-2 mb-4">
        {(["all", "expiring", "expired"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? "bg-brand-600 text-white" : "bg-white border border-slate-300 text-slate-700"}`}
          >
            {f === "all" ? "Semua" : f === "expiring" ? "Segera (≤30 hari)" : "Kadaluarsa"}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState message="Tidak ada batch pada filter ini." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Barang</th>
                <th className="th">Kode Batch</th>
                <th className="th">Tanggal Masuk</th>
                <th className="th">Kadaluarsa</th>
                <th className="th text-right">Sisa Stok</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.batch_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">{b.product_name}</td>
                  <td className="td">{b.batch_code || "-"}</td>
                  <td className="td">{b.received_date}</td>
                  <td className="td">{b.expiry_date ?? "-"}</td>
                  <td className="td text-right">{b.remaining}</td>
                  <td className="td">
                    {b.is_expired ? (
                      <Badge tone="red">Kadaluarsa</Badge>
                    ) : b.expiry_date === null ? (
                      <Badge tone="slate">Tanpa kadaluarsa</Badge>
                    ) : (b.days_until_expiry ?? 0) <= 7 ? (
                      <Badge tone="red">{(b.days_until_expiry ?? 0)} hari lagi</Badge>
                    ) : (b.days_until_expiry ?? 0) <= 30 ? (
                      <Badge tone="amber">{(b.days_until_expiry ?? 0)} hari lagi</Badge>
                    ) : (
                      <Badge tone="green">Aman</Badge>
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
