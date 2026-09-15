import { useEffect, useState } from "react";
import { api, fetchAll } from "../api/client";
import { Customer } from "../types";
import { EmptyState, ErrorNote, Modal, PageHeader, Spinner } from "../components/ui";

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const load = () => {
    setLoading(true);
    fetchAll<Customer>("customers")
      .then(setRows)
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat pelanggan."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setContact("");
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setName(c.name);
    setContact(c.contact_info);
    setModalOpen(true);
  };

  const submit = async () => {
    setError("");
    try {
      const payload = { name, contact_info: contact };
      if (editing) await api.put(`customers/${editing.customer_id}/`, payload);
      else await api.post("customers/", payload);
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(JSON.stringify(e?.response?.data ?? "Gagal menyimpan."));
    }
  };

  const remove = async (c: Customer) => {
    setError("");
    try {
      await api.delete(`customers/${c.customer_id}/`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Gagal menghapus.");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        subtitle="Data pelanggan toko."
        action={
          <button className="btn-primary" onClick={openCreate}>
            + Tambah Pelanggan
          </button>
        }
      />
      <ErrorNote message={error} />

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState message="Belum ada pelanggan." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Nama</th>
                <th className="th">Kontak</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.customer_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td">{c.contact_info || "-"}</td>
                  <td className="td text-right whitespace-nowrap">
                    <button className="text-brand-600 hover:underline mr-3" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => remove(c)}>
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
        title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
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
        <div className="space-y-4">
          <div>
            <label className="label">Nama</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Kontak</label>
            <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
