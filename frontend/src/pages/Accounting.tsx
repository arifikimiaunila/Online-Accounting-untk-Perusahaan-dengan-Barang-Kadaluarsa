import { useEffect, useState } from "react";
import { api, fetchAll, fmtIDR } from "../api/client";
import { ChartOfAccount, JournalEntry } from "../types";
import {
  EmptyState,
  ErrorNote,
  Modal,
  PageHeader,
  Spinner,
} from "../components/ui";
import ExportButtons from "../components/ExportButtons";

interface TrialRow {
  account__code: string;
  account__name: string;
  total_debit: number;
  total_credit: number;
}

interface PL {
  revenue: number;
  expense: number;
  profit: number;
}

type Tab = "journal" | "trial" | "pl" | "accounts";

export default function Accounting() {
  const [tab, setTab] = useState<Tab>("journal");
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [trial, setTrial] = useState<{ rows: TrialRow[]; total_debit: number; total_credit: number; balanced: boolean } | null>(null);
  const [pl, setPl] = useState<PL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", account: "", debit: "", credit: "" });

  const loadJournal = (params: Record<string, unknown> = {}) =>
    fetchAll<JournalEntry>("journal-entries", params).then(setJournal);

  const loadAccounts = () =>
    fetchAll<ChartOfAccount>("accounts").then(setAccounts);

  const applyJournalFilter = () =>
    loadJournal({
      date_after: fromDate || undefined,
      date_before: toDate || undefined,
    });

  const resetJournalFilter = () => {
    setFromDate("");
    setToDate("");
    loadJournal();
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadJournal(), loadAccounts()])
      .catch((e) => setError(e?.response?.data?.detail ?? "Gagal memuat data."))
      .finally(() => setLoading(false));
  }, []);

  const loadReports = () => {
    api.get("journal-entries/trial_balance").then((r) => setTrial(r.data));
    api.get("journal-entries/profit_loss").then((r) => setPl(r.data));
  };

  useEffect(() => {
    if (tab === "trial" || tab === "pl") loadReports();
  }, [tab]);

  const submit = async () => {
    setError("");
    try {
      await api.post("journal-entries/", {
        date: form.date,
        description: form.description,
        account: Number(form.account),
        debit: Number(form.debit || 0),
        credit: Number(form.credit || 0),
        reference_type: "manual",
      });
      setModalOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), description: "", account: "", debit: "", credit: "" });
      await loadJournal();
    } catch (e: any) {
      setError(JSON.stringify(e?.response?.data ?? "Gagal menyimpan."));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Akuntansi"
        subtitle="Jurnal, neraca saldo, laba/rugi, dan daftar akun."
        action={
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            + Jurnal Manual
          </button>
        }
      />
      <ErrorNote message={error} />

      <div className="flex gap-2 mb-4">
        {(
          [
            ["journal", "Jurnal"],
            ["trial", "Neraca Saldo"],
            ["pl", "Laba / Rugi"],
            ["accounts", "Daftar Akun"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn ${tab === key ? "bg-brand-600 text-white" : "bg-white border border-slate-300 text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "journal" && (
        <>
          <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Dari</label>
              <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Sampai</label>
              <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={applyJournalFilter}>Filter</button>
            <button className="btn-secondary" onClick={resetJournalFilter}>Reset</button>
          </div>
          <div className="card overflow-hidden">
            {journal.length === 0 ? (
              <EmptyState message="Belum ada jurnal." />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Tanggal</th>
                  <th className="th">Keterangan</th>
                  <th className="th">Akun</th>
                  <th className="th text-right">Debit</th>
                  <th className="th text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((j) => (
                  <tr key={j.journal_entry_id} className="border-t border-slate-100">
                    <td className="td">{j.date}</td>
                    <td className="td">{j.description}</td>
                    <td className="td text-slate-500">
                      {j.account_code} · {j.account_name}
                    </td>
                    <td className="td text-right">{j.debit ? fmtIDR(j.debit) : "-"}</td>
                    <td className="td text-right">{j.credit ? fmtIDR(j.credit) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </>
      )}

      {tab === "trial" && trial && (
        <>
          <div className="mb-3 flex justify-end">
            <ExportButtons path="reports/trial-balance/" params={{}} filenameBase="neraca-saldo" />
          </div>
          <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Kode</th>
                <th className="th">Akun</th>
                <th className="th text-right">Debit</th>
                <th className="th text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {trial.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="td text-slate-500">{r.account__code}</td>
                  <td className="td">{r.account__name}</td>
                  <td className="td text-right">{r.total_debit ? fmtIDR(r.total_debit) : "-"}</td>
                  <td className="td text-right">{r.total_credit ? fmtIDR(r.total_credit) : "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={2} className="td font-semibold">
                  Total {trial.balanced ? "✅ Seimbang" : "❌ Tidak seimbang"}
                </td>
                <td className="td text-right font-bold">{fmtIDR(trial.total_debit)}</td>
                <td className="td text-right font-bold">{fmtIDR(trial.total_credit)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </>
      )}

      {tab === "pl" && pl && (
        <>
          <div className="mb-3 flex justify-end">
            <ExportButtons path="reports/profit-loss/" params={{}} filenameBase="laba-rugi" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-sm text-slate-500">Pendapatan</p>
            <p className="text-2xl font-bold text-green-600">{fmtIDR(pl.revenue)}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Beban</p>
            <p className="text-2xl font-bold text-red-600">{fmtIDR(pl.expense)}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Laba Bersih</p>
            <p className="text-2xl font-bold text-brand-600">{fmtIDR(pl.profit)}</p>
          </div>
          </div>
        </>
      )}

      {tab === "accounts" && (
        <div className="card overflow-hidden">
          {accounts.length === 0 ? (
            <EmptyState message="Belum ada akun." />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Kode</th>
                  <th className="th">Nama Akun</th>
                  <th className="th">Tipe</th>
                  <th className="th">Aktif</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.account_id} className="border-t border-slate-100">
                    <td className="td text-slate-500">{a.code}</td>
                    <td className="td font-medium">{a.name}</td>
                    <td className="td capitalize">{a.account_type}</td>
                    <td className="td">{a.is_active ? "✅" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        title="Jurnal Manual"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Akun</label>
            <select className="input" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
              <option value="">— Pilih akun —</option>
              {accounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Keterangan</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Debit (Rp)</label>
            <input type="number" className="input" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} />
          </div>
          <div>
            <label className="label">Kredit (Rp)</label>
            <input type="number" className="input" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
