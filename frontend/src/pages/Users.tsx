import { useEffect, useState } from "react";
import { api, fetchAll } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { UserAdmin } from "../types";
import {
  Badge,
  EmptyState,
  ErrorNote,
  PageHeader,
  Spinner,
} from "../components/ui";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "kasir", label: "Kasir" },
  { value: "gudang", label: "Gudang" },
  { value: "akuntan", label: "Akuntan" },
];

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const isAdmin = !!user && (user.is_superuser || user.role === "admin");

  const load = () => {
    setLoading(true);
    fetchAll<UserAdmin>("users")
      .then(setUsers)
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat pengguna."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const changeRole = async (u: UserAdmin, role: string) => {
    setSavingId(u.id);
    setError("");
    try {
      await api.patch(`users/${u.id}/`, { role });
      load();
    } catch (e: any) {
      setError(JSON.stringify(e?.response?.data ?? "Gagal mengubah role."));
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Pengguna" subtitle="Manajemen pengguna & role (khusus admin)." />
        <div className="card p-8 text-center text-slate-500">
          Anda tidak memiliki akses ke halaman ini. Hanya <strong>Admin</strong> yang
          dapat mengelola pengguna.
        </div>
      </div>
    );
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Pengguna"
        subtitle="Kelola pengguna dan ubah role mereka."
      />
      <ErrorNote message={error} />

      <div className="card overflow-hidden">
        {users.length === 0 ? (
          <EmptyState message="Belum ada pengguna." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Username</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td font-medium">{u.username}</td>
                  <td className="td text-slate-500">{u.email || "-"}</td>
                  <td className="td">
                    {u.is_superuser ? (
                      <Badge tone="blue">Superuser</Badge>
                    ) : (
                      <select
                        className="input py-1 w-36"
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => changeRole(u, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="td">
                    {u.is_superuser ? (
                      <Badge tone="blue">Superuser</Badge>
                    ) : (
                      <Badge tone="green">Aktif</Badge>
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
