import { useEffect, useMemo, useState } from "react";
import { fetchAll } from "../api/client";
import type { Inventory } from "../types";
import { Badge, EmptyState, ErrorNote, PageHeader, Spinner } from "../components/ui";

export default function Inventory() {
  const [rows, setRows] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAll<Inventory>("inventory")
      .then(setRows)
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat stok."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.product_name.toLowerCase().includes(search.toLowerCase()) ||
          r.location.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Stok"
        subtitle="Posisi stok tersedia per barang dan per batch."
      />
      <ErrorNote message={error} />

      <input
        className="input max-w-sm mb-4"
        placeholder="Cari barang / lokasi…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState message="Belum ada stok tercatat." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Barang</th>
                <th className="th">Batch</th>
                <th className="th">Kadaluarsa</th>
                <th className="th">Lokasi</th>
                <th className="th text-right">Tersedia</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.inventory_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">{r.product_name}</td>
                  <td className="td">{r.batch_code || "-"}</td>
                  <td className="td">{r.expiry_date ?? "-"}</td>
                  <td className="td">{r.location || "-"}</td>
                  <td className="td text-right font-semibold">{r.quantity_available}</td>
                  <td className="td">
                    {r.quantity_available === 0 ? (
                      <Badge tone="red">Habis</Badge>
                    ) : r.quantity_available <= 5 ? (
                      <Badge tone="amber">Menipis</Badge>
                    ) : (
                      <Badge tone="green">Tersedia</Badge>
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
