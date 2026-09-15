import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorNote } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("kasir");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password, role);
      navigate("/");
    } catch (err: any) {
      setError(
        err?.response?.data
          ? JSON.stringify(err.response.data)
          : "Pendaftaran gagal."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Buat Akun</h1>
          <p className="text-sm text-slate-500">Daftar untuk mulai menggunakan aplikasi</p>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-4">
          <ErrorNote message={error} />
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email (opsional)</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="kasir">Kasir</option>
              <option value="gudang">Gudang</option>
              <option value="akuntan">Akuntan</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="label">Konfirmasi Password</label>
            <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "Memproses…" : "Daftar"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-brand-600 hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
