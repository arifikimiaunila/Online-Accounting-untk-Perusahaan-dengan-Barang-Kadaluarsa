import { useEffect, useMemo, useState } from "react";
import { api, fetchAll, fmtIDR } from "../api/client";
import { Category, Product } from "../types";
import {
  Badge,
  EmptyState,
  ErrorNote,
  Modal,
  PageHeader,
  Spinner,
} from "../components/ui";

const emptyForm = {
  name: "",
  sku: "",
  category: "" as string,
  price: "",
  cost: "",
  has_expiry: false,
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchAll<Product>("products"), fetchAll<Category>("categories")])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat data."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category ? String(p.category) : "",
      price: String(p.price),
      cost: String(p.cost),
      has_expiry: p.has_expiry,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category ? Number(form.category) : null,
        price: Number(form.price),
        cost: Number(form.cost),
        has_expiry: form.has_expiry,
      };
      if (editing) {
        await api.put(`products/${editing.product_id}/`, payload);
      } else {
        await api.post("products/", payload);
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(
        typeof e?.response?.data === "object"
          ? JSON.stringify(e.response.data)
          : "Gagal menyimpan barang."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setError("");
    try {
      await api.delete(`products/${deleting.product_id}/`);
      setDeleting(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Gagal menghapus barang.");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Barang"
        subtitle="Kelola produk beserta harga jual/beli dan penanda kadaluarsa."
        action={
          <button className="btn-primary" onClick={openCreate}>
            + Tambah Barang
          </button>
        }
      />
      <ErrorNote message={error} />

      <input
        className="input max-w-sm mb-4"
        placeholder="Cari nama / SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState message="Belum ada barang. Tambahkan barang pertama Anda." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Nama</th>
                <th className="th">SKU</th>
                <th className="th">Kategori</th>
                <th className="th text-right">Harga Jual</th>
                <th className="th text-right">Harga Beli</th>
                <th className="th text-right">Stok</th>
                <th className="th">Kadaluarsa</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.product_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td text-slate-500">{p.sku}</td>
                  <td className="td">{p.category_name ?? "-"}</td>
                  <td className="td text-right">{fmtIDR(p.price)}</td>
                  <td className="td text-right text-slate-500">{fmtIDR(p.cost)}</td>
                  <td className="td text-right">{p.available_stock}</td>
                  <td className="td">
                    {p.has_expiry ? <Badge tone="amber">Per batch</Badge> : <Badge tone="slate">Tanpa</Badge>}
                  </td>
                  <td className="td text-right whitespace-nowrap">
                    <button className="text-brand-600 hover:underline mr-3" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => setDeleting(p)}>
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
        title={editing ? "Edit Barang" : "Tambah Barang"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nama Barang</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">SKU</label>
            <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">— Tanpa kategori —</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Harga Jual (Rp)</label>
            <input
              type="number"
              className="input"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Harga Beli (Rp)</label>
            <input
              type="number"
              className="input"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.has_expiry}
              onChange={(e) => setForm({ ...form, has_expiry: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Barang ini punya tanggal kadaluarsa (dipantau per batch)
          </label>
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        title="Hapus Barang"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleting(null)}>
              Batal
            </button>
            <button className="btn-danger" onClick={confirmDelete}>
              Hapus
            </button>
          </>
        }
      >
        <p>
          Yakin ingin menghapus <strong>{deleting?.name}</strong>? Barang yang sudah
          terpakai di transaksi tidak bisa dihapus.
        </p>
      </Modal>
    </div>
  );
}
