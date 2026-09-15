import { useEffect, useState } from "react";
import { api, fetchAll } from "../api/client";
import { Product, StockCard as StockCardData } from "../types";
import { EmptyState, ErrorNote, PageHeader, Spinner } from "../components/ui";
import ExportButtons from "../components/ExportButtons";

export default function StockCard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState<StockCardData | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll<Product>("products")
      .then(setProducts)
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat barang."))
      .finally(() => setLoadingProducts(false));
  }, []);

  const load = async () => {
    if (!product) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("stock-movements/stock_card", {
        params: {
          product,
          start: start || undefined,
          end: end || undefined,
        },
      });
      setData(res.data as StockCardData);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Gagal memuat kartu stok.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const selected = products.find((p) => String(p.product_id) === product);

  const totalIn = data
    ? data.rows
        .filter((r) => r.movement_type === "in")
        .reduce((s, r) => s + r.quantity, 0)
    : 0;
  const totalOut = data
    ? data.rows
        .filter((r) => r.movement_type === "out")
        .reduce((s, r) => s + r.quantity, 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Kartu Stok"
        subtitle="Riwayat mutasi stok keluar/masuk per barang dengan saldo berjalan."
      />
      <ErrorNote message={error} />

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <label className="label">Barang</label>
            <select
              className="input"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={loadingProducts}
            >
              <option value="">— Pilih barang —</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dari Tanggal</label>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">Sampai Tanggal</label>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={load} disabled={!product || loading}>
              {loading ? "Memuat…" : "Tampilkan"}
            </button>
          </div>
          {product && (
            <div className="flex items-end">
              <ExportButtons
                path="reports/stock-card/"
                params={{ product, start: start || undefined, end: end || undefined }}
                filenameBase="kartu-stok"
              />
            </div>
          )}
        </div>
      </div>

      {loading && <Spinner />}

      {!loading && data && selected && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-slate-500">Barang</p>
              <p className="font-semibold">{selected.name}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Saldo Awal</p>
              <p className="text-xl font-bold">{data.opening_balance}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Saldo Akhir</p>
              <p className="text-xl font-bold text-brand-600">{data.closing_balance}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">
                Masuk <span className="text-green-600">+{totalIn}</span> · Keluar{" "}
                <span className="text-red-600">-{totalOut}</span>
              </p>
              <p className="text-xl font-bold">
                {totalIn - totalOut >= 0 ? "+" : ""}
                {totalIn - totalOut}
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            {data.rows.length === 0 ? (
              <EmptyState message="Tidak ada mutasi pada rentang tanggal ini." />
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Tanggal</th>
                    <th className="th">Tipe</th>
                    <th className="th">Batch</th>
                    <th className="th text-right">Masuk</th>
                    <th className="th text-right">Keluar</th>
                    <th className="th text-right">Saldo</th>
                    <th className="th">Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.movement_id} className="border-t border-slate-100">
                      <td className="td">{r.date}</td>
                      <td className="td">
                        <span className={`font-medium ${r.movement_type === "in" ? "text-green-600" : "text-red-600"}`}>
                          {r.movement_type_label}
                        </span>
                      </td>
                      <td className="td">{r.batch_code || "-"}</td>
                      <td className="td text-right text-green-600">
                        {r.movement_type === "in" ? `+${r.quantity}` : ""}
                      </td>
                      <td className="td text-right text-red-600">
                        {r.movement_type === "out" ? `-${r.quantity}` : ""}
                      </td>
                      <td className="td text-right font-semibold">{r.balance}</td>
                      <td className="td text-slate-500">
                        {r.reference_type_label}
                        {r.reference_id ? ` #${r.reference_id}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="td font-semibold" colSpan={3}>
                      Total
                    </td>
                    <td className="td text-right font-bold text-green-600">+{totalIn}</td>
                    <td className="td text-right font-bold text-red-600">-{totalOut}</td>
                    <td className="td text-right font-bold">{data.closing_balance}</td>
                    <td className="td"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {!loading && !data && !loadingProducts && (
        <EmptyState message="Pilih barang lalu klik Tampilkan untuk melihat kartu stok." />
      )}
    </div>
  );
}
