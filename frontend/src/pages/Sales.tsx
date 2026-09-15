import { useEffect, useMemo, useState } from "react";
import { api, fetchAll, fmtIDR } from "../api/client";
import { Customer, Product, Sale, SaleItem } from "../types";
import {
  Badge,
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
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer",
  "e-wallet": "E-Wallet",
};

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("cash");
  const [lines, setLines] = useState<Line[]>([{ product: "", quantity: "1" }]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);

  const load = (params: Record<string, unknown> = {}) => {
    setLoading(true);
    Promise.all([
      fetchAll<Sale>("sales", params),
      fetchAll<Product>("products"),
      fetchAll<Customer>("customers"),
    ])
      .then(([s, p, c]) => {
        setSales(s);
        setProducts(p);
        setCustomers(c);
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
        return sum + (p ? p.price * (Number(l.quantity) || 0) : 0);
      }, 0),
    [lines, productMap]
  );

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLine = () => setLines((ls) => [...ls, { product: "", quantity: "1" }]);
  const removeLine = (i: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const items: SaleItem[] = lines
        .filter((l) => l.product && Number(l.quantity) > 0)
        .map((l) => ({
          product: Number(l.product),
          quantity: Number(l.quantity),
          price: productMap[l.product]?.price ?? 0,
        }));
      if (items.length === 0) throw new Error("Minimal satu item.");
      await api.post("sales/", {
        date,
        customer: customer ? Number(customer) : null,
        payment_method: payment,
        items,
      });
      setModalOpen(false);
      setLines([{ product: "", quantity: "1" }]);
      load();
    } catch (e: any) {
      setError(
        e?.response?.data
          ? typeof e.response.data === "string"
            ? e.response.data
            : JSON.stringify(e.response.data)
          : e.message ?? "Gagal menyimpan penjualan."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (s: Sale) => {
    setError("");
    try {
      await api.delete(`sales/${s.sale_id}/`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Gagal menghapus penjualan.");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Penjualan"
        subtitle="Catat transaksi penjualan. Stok (FEFO) otomatis berkurang."
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            + Penjualan Baru
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
            path="reports/sales/"
            params={{ date_after: fromDate || undefined, date_before: toDate || undefined }}
            filenameBase="laporan-penjualan"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {sales.length === 0 ? (
          <EmptyState message="Belum ada penjualan." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">No</th>
                <th className="th">Tanggal</th>
                <th className="th">Pelanggan</th>
                <th className="th">Metode</th>
                <th className="th text-right">Total</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.sale_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">#{s.sale_id}</td>
                  <td className="td">{s.date}</td>
                  <td className="td">{s.customer_name ?? "-"}</td>
                  <td className="td">
                    <Badge tone="blue">{PAYMENT_LABEL[s.payment_method] ?? s.payment_method}</Badge>
                  </td>
                  <td className="td text-right font-semibold">{fmtIDR(s.total_amount)}</td>
                  <td className="td text-right whitespace-nowrap">
                    <button className="text-brand-600 hover:underline mr-3" onClick={() => setDetail(s)}>
                      Detail
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => confirmDelete(s)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form penjualan baru */}
      <Modal
        open={modalOpen}
        title="Penjualan Baru"
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
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Pelanggan</label>
            <select className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="">— Umum —</option>
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Metode</label>
            <select className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="e-wallet">E-Wallet</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => {
            const prod = productMap[l.product];
            return (
              <div key={i} className="flex gap-2 items-start">
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
                <div className="input w-28 text-right bg-slate-50">
                  {prod ? fmtIDR(prod.price * (Number(l.quantity) || 0)) : "-"}
                </div>
                <button className="btn-secondary px-2" onClick={() => removeLine(i)} title="Hapus baris">
                  ✕
                </button>
              </div>
            );
          })}
          <button className="btn-secondary text-sm" onClick={addLine}>
            + Tambah baris
          </button>
        </div>
        {products.some((p) => p.available_stock <= 0) && (
          <p className="text-xs text-amber-600 mt-3">⚠️ Ada barang yang stoknya habis.</p>
        )}
      </Modal>

      {/* Detail penjualan */}
      <Modal open={!!detail} title={`Detail Penjualan #${detail?.sale_id}`} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <span className="text-slate-500">Tanggal</span>
              <span>{detail.date}</span>
              <span className="text-slate-500">Pelanggan</span>
              <span>{detail.customer_name ?? "-"}</span>
              <span className="text-slate-500">Metode</span>
              <span>{PAYMENT_LABEL[detail.payment_method] ?? detail.payment_method}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Barang</th>
                  <th className="th">Batch</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right">Harga</th>
                  <th className="th text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="td">{it.product_name}</td>
                    <td className="td">{it.batch_code ?? "-"}</td>
                    <td className="td text-right">{it.quantity}</td>
                    <td className="td text-right">{fmtIDR(it.price)}</td>
                    <td className="td text-right">{fmtIDR(it.subtotal ?? it.price * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="td font-semibold text-right">
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
