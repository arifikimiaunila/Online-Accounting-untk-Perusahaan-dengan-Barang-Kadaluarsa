import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  kasir: "Kasir",
  gudang: "Gudang",
  akuntan: "Akuntan",
};

const nav = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/sales", label: "Penjualan", icon: "🛒" },
  { to: "/purchases", label: "Pembelian", icon: "📦" },
  { to: "/products", label: "Barang", icon: "🏷️" },
  { to: "/categories", label: "Kategori", icon: "🗂️" },
  { to: "/batches", label: "Batch & Kadaluarsa", icon: "⏳" },
  { to: "/inventory", label: "Stok", icon: "📋" },
  { to: "/stock-card", label: "Kartu Stok", icon: "🧮" },
  { to: "/customers", label: "Pelanggan", icon: "👥" },
  { to: "/suppliers", label: "Pemasok", icon: "🚚" },
  { to: "/accounting", label: "Akuntansi", icon: "📒" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = !!user && (user.is_superuser || user.role === "admin");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-brand-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <h1 className="text-lg font-bold leading-tight">Akuntansi Toko</h1>
          <p className="text-xs text-brand-100/70">Manajemen stok & kadaluarsa</p>
        </div>
        <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white border-l-4 border-brand-500"
                    : "text-brand-100/80 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white border-l-4 border-brand-500"
                    : "text-brand-100/80 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span className="text-base">🔐</span>
              Pengguna
            </NavLink>
          )}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h2 className="text-sm text-slate-500">Online Akunting · Toko</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{user?.username}</span>
            {user && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            )}
            <button className="btn-secondary text-xs" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
