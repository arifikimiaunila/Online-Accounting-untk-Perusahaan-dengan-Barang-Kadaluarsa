import { useEffect, useState } from "react";
import { api, fetchAll } from "../api/client";
import { Category } from "../types";
import { EmptyState, ErrorNote, Modal, PageHeader, Spinner } from "../components/ui";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAll<Category>("categories")
      .then(setCategories)
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat kategori."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async () => {
    setError("");
    try {
      await api.post("categories/", { name });
      setName("");
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(JSON.stringify(e?.response?.data ?? "Gagal menyimpan."));
    }
  };

  const remove = async (c: Category) => {
    setError("");
    try {
      await api.delete(`categories/${c.category_id}/`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Gagal menghapus kategori.");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Kategori"
        subtitle="Pengelompokan barang (makanan, minuman, elektronik, dst)."
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            + Tambah Kategori
          </button>
        }
      />
      <ErrorNote message={error} />

      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState message="Belum ada kategori." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c.category_id} className="flex items-center justify-between px-5 py-3">
                <span className="font-medium">{c.name}</span>
                <button className="text-red-600 hover:underline text-sm" onClick={() => remove(c)}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Tambah Kategori"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={submit}>
              Simpan
            </button>
          </>
        }
      >
        <label className="label">Nama Kategori</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Makanan" />
      </Modal>
    </div>
  );
}
