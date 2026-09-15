import { useEffect, useMemo, useState } from "react";
import { api, fetchAll, fmtIDR } from "../api/client";
import { Product, Purchase, PurchaseItem, Supplier } from "../types";
import {
  EmptyState,
  ErrorNote,
  Modal,
  PageHeader,
  Spinner,
} from "../components/ui";
import ExportButtons from "../components/ExportButtons";

interface Line {
  product: string;
  quantity: string;
  cost: string;
  batch_code: string;
  expiry_date: string;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { product: "", quantity: "1", cost: "", batch_code: "", expiry_date: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Purchase | null>(null);

  const load = (params: Record<string, unknown> = {}) => {
    setLoading(true);
    Promise.all([
      fetchAll<Purchase>("purchases", params),
      fetchAll<Product>("products"),
      fetchAll<Supplier>("suppliers"),
    ])
      .then(([p, pr, s]) => {
        setPurchases(p);
        setProducts(pr);
        setSuppliers(s);
      })
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const applyFilter = () =>
    load({
      date_after: fromDate || undefined,
      date_before: toDate || undefined,
    });

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    load();
  };

  const productMap = useMemo(() => {
    const m: Record<string, Product> = {};
    products.forEach((p) => (m[String(p.product_id)] = p));
    return m;
  }, [products]);

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = productMap[l.product];
        const cost = l.cost !== "" ? Number(l.cost) : p?.cost ?? 0;
        return sum + cost * (Number(l.quantity) || 0);
      }, 0),
    [lines, productMap]
  );

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) => [...ls, { product: "", quantity: "1", cost: "", batch_code: "", expiry_date: "" }]);
  const removeLine = (i: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const items: PurchaseItem[] = lines
        .filter((l) => l.product && Number(l.quantity) > 0)
        .map((l) => {
          const p = productMap[l.product];
          return {
            product: Number(l.product),
            quantity: Number(l.quantity),
            cost: l.cost !== "" ? Number(l.cost) : p?.cost ?? 0,
            new_batch_code: l.batch_code,
            new_expiry_date: l.expiry_date || null,
          };
        });
      if (items.length === 0) throw new Error("Minimal satu item.");
      await api.post("purchases/", {
        date,
        supplier: supplier ? Number(supplier) : null,
        items,
      });
      setModalOpen(false);
      setLines([{ product: "", quantity: "1", cost: "", batch_code: "", expiry_date: "" }]);
      load();
    } catch (e: any) {
      setError(
        e?.response?.data
          ? typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data)
          : e.message ?? "Gagal menyimpan pembelian."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (p: Purchase) => {
    setError("");
    try {
      await api.delete(`purchases/${p.purchase_id}/`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Gagal menghapus pembelian.");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Pembelian"
        subtitle="Catat pembelian dari supplier. Stok otomatis bertambah (batch baru bila kadaluarsa)."
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            + Pembelian Baru
          </button>
        }
      />
      <ErrorNote message={error} />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Dari</label>
          <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Sampai</label>
          <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={applyFilter}>Filter</button>
        <button className="btn-secondary" onClick={resetFilter}>Reset</button>
        <div className="ml-auto">
          <ExportButtons
            path="reports/purchases/"
            params={{ date_after: fromDate || undefined, date_before: toDate || undefined }}
            filenameBase="laporan-pembelian"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {purchases.length === 0 ? (
          <EmptyState message="Belum ada pembelian." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">No</th>
                <th className="th">Tanggal</th>
                <th className="th">Pemasok</th>
                <th className="th text-right">Total</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.purchase_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">#{p.purchase_id}</td>
                  <td className="td">{p.date}</td>
                  <td className="td">{p.supplier_name ?? "-"}</td>
                  <td className="td text-right font-semibold">{fmtIDR(p.total_amount)}</td>
                  <td className="td text-right whitespace-nowrap">
                    <button className="text-brand-600 hover:underline mr-3" onClick={() => setDetail(p)}>
                      Detail
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => confirmDelete(p)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Pembelian Baru"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <span className="mr-auto text-lg font-bold text-slate-900">{fmtIDR(total)}</span>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Pemasok</label>
            <select className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">— Pilih pemasok —</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => {
            const prod = productMap[l.product];
            const needsExpiry = prod?.has_expiry;
            return (
              <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="input flex-1"
                    value={l.product}
                    onChange={(e) => setLine(i, { product: e.target.value })}
                  >
                    <option value="">— Pilih barang —</option>
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} {p.has_expiry ? " (kadaluarsa)" : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input w-20"
                    value={l.quantity}
                    onChange={(e) => setLine(i, { quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    className="input w-28"
                    placeholder="Harga beli"
                    value={l.cost}
                    onChange={(e) => setLine(i, { cost: e.target.value })}
                  />
                  <button className="btn-secondary px-2" onClick={() => removeLine(i)} title="Hapus baris">
                    ✕
                  </button>
                </div>
                {needsExpiry && (
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Kode batch (opsional)"
                      value={l.batch_code}
                      onChange={(e) => setLine(i, { batch_code: e.target.value })}
                    />
                    <input
                      type="date"
                      className="input w-44"
                      value={l.expiry_date}
                      onChange={(e) => setLine(i, { expiry_date: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <button className="btn-secondary text-sm" onClick={addLine}>
            + Tambah baris
          </button>
        </div>
      </Modal>

      <Modal open={!!detail} title={`Detail Pembelian #${detail?.purchase_id}`} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <span className="text-slate-500">Tanggal</span>
              <span>{detail.date}</span>
              <span className="text-slate-500">Pemasok</span>
              <span>{detail.supplier_name ?? "-"}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Barang</th>
                  <th className="th">Batch</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right">Harga Beli</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="td">{it.product_name}</td>
                    <td className="td">{it.batch_code ?? "-"}</td>
                    <td className="td text-right">{it.quantity}</td>
                    <td className="td text-right">{fmtIDR(it.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="td font-semibold text-right">
                    Total
                  </td>
                  <td className="td text-right font-bold">{fmtIDR(detail.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
