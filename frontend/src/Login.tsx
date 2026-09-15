import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorNote } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "Login gagal. Periksa username dan password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Akuntansi Toko</h1>
          <p className="text-sm text-slate-500">Masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-4">
          <ErrorNote message={error} />
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "Memproses…" : "Masuk"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Belum punya akun?{" "}
            <Link to="/register" className="text-brand-600 hover:underline">
              Daftar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
