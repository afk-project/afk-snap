import { ArrowDownRight, ArrowUpRight, Coins, Download, Image, ReceiptText, RefreshCw, TrendingUp, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { notify } from "../services/notify";

const periods = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan" },
  { id: "yearly", label: "Tahunan" },
];
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("id-ID");

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("daily");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async (selected = period) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/reports?period=${selected}`);
      setReport(data.data);
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(() => report ? [
    { key: "revenue", label: "Omzet", value: rupiah.format(report.summary.revenue), icon: TrendingUp },
    { key: "transactions", label: "Transaksi sukses", value: number.format(report.summary.transactions), icon: ReceiptText },
    { key: "creditsSold", label: "Credit terjual", value: number.format(report.summary.creditsSold), icon: Coins },
    { key: "newUsers", label: "User baru", value: number.format(report.summary.newUsers), icon: UserPlus },
    { key: "generations", label: "Generation AI", value: number.format(report.summary.generations), icon: Image },
  ] : [], [report]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ["Periode", "Tanggal mulai", "Omzet", "Transaksi", "Credit terjual", "User baru", "Generation", "Generation selesai", "Credit terpakai"],
      ...report.series.map((item) => [item.label, item.start, item.revenue, item.transactions, item.creditsSold, item.newUsers, item.generations, item.completedGenerations, item.creditsUsed]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `afksnap-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Report CSV berhasil diunduh");
  };

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Admin Report</p><h1 className="mt-2 text-3xl font-black">Performa bisnis AFKSnap.</h1><p className="mt-1 text-sm text-[var(--muted)]">Omzet, transaksi, credit, user, dan aktivitas AI dibandingkan dengan periode sebelumnya.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => loadReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-black disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan</button><button type="button" onClick={exportCsv} disabled={!report} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Download size={16} /> Export CSV</button></div>
      </section>

      <div className="flex flex-wrap gap-2">{periods.map((item) => <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={`rounded-xl px-4 py-2.5 text-sm font-black ${period === item.id ? "bg-orange-500 text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>{item.label}</button>)}</div>

      {loading && !report ? <div className="grid min-h-80 place-items-center rounded-3xl bg-[var(--surface)]"><RefreshCw className="animate-spin text-orange-500" size={32} /></div> : report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ key, label, value, icon: Icon }) => <MetricCard key={key} label={label} value={value} comparison={report.comparison[key]} icon={Icon} currency={key === "revenue"} />)}</div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_.5fr]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="mb-6"><h2 className="text-xl font-black">Diagram omzet {report.periodLabel.toLowerCase()}</h2><p className="mt-1 text-xs text-[var(--muted)]">{report.series.length} periode terakhir · zona waktu {report.timezone}</p></div><RevenueChart items={report.series} /></section>
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><h2 className="text-xl font-black">Ringkasan sistem</h2><div className="mt-5 space-y-3"><SummaryRow icon={Users} label="Total user" value={number.format(report.totals.users)} /><SummaryRow icon={Coins} label="Credit aktif" value={number.format(report.totals.walletCredits)} /><SummaryRow icon={Image} label="Generation selesai" value={number.format(report.summary.completedGenerations)} /><SummaryRow icon={Coins} label="Credit AI terpakai" value={number.format(report.summary.creditsUsed)} /></div><div className="mt-6 rounded-2xl bg-orange-500/10 p-4"><p className="text-xs font-black uppercase tracking-wider text-orange-500">Margin vs periode lalu</p><p className="mt-2 text-2xl font-black">{rupiah.format(report.comparison.revenue.difference)}</p><p className={`mt-1 text-sm font-bold ${report.comparison.revenue.percent >= 0 ? "text-emerald-500" : "text-red-500"}`}>{report.comparison.revenue.percent >= 0 ? "+" : ""}{report.comparison.revenue.percent}%</p></div></section>
        </div>

        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]"><div className="border-b border-[var(--border)] p-5"><h2 className="text-xl font-black">Detail per periode</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Periode</th><th className="px-5 py-4">Omzet</th><th className="px-5 py-4">Transaksi</th><th className="px-5 py-4">Credit</th><th className="px-5 py-4">User</th><th className="px-5 py-4">Generation</th></tr></thead><tbody>{[...report.series].reverse().map((item) => <tr key={item.start} className="border-t border-[var(--border)]"><td className="px-5 py-4 font-black">{item.label}</td><td className="px-5 py-4">{rupiah.format(item.revenue)}</td><td className="px-5 py-4">{number.format(item.transactions)}</td><td className="px-5 py-4">{number.format(item.creditsSold)}</td><td className="px-5 py-4">{number.format(item.newUsers)}</td><td className="px-5 py-4">{number.format(item.generations)}</td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  );
}

function MetricCard({ label, value, comparison: data, icon: Icon, currency }) {
  const positive = data?.difference >= 0;
  const DifferenceIcon = positive ? ArrowUpRight : ArrowDownRight;
  return <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="grid size-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-500"><Icon size={21} /></span><p className="mt-4 text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className={`mt-3 flex items-center gap-1 text-xs font-black ${positive ? "text-emerald-500" : "text-red-500"}`}><DifferenceIcon size={15} /> {positive ? "+" : ""}{data?.percent || 0}% <span className="font-medium text-[var(--muted)]">({currency ? rupiah.format(data?.difference || 0) : number.format(data?.difference || 0)})</span></p></article>;
}

function RevenueChart({ items }) {
  const maximum = Math.max(...items.map((item) => item.revenue), 1);
  return <div className="flex h-72 items-end gap-2 overflow-x-auto border-b border-[var(--border)] pb-8">{items.map((item) => <div key={item.start} className="group flex h-full min-w-12 flex-1 flex-col justify-end"><div className="relative mx-auto w-full max-w-14 rounded-t-xl bg-gradient-to-t from-orange-600 to-orange-400 transition group-hover:brightness-110" style={{ height: `${Math.max((item.revenue / maximum) * 100, item.revenue ? 6 : 2)}%` }}><span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-bold text-white group-hover:block">{rupiah.format(item.revenue)}</span></div><p className="mt-2 -rotate-45 whitespace-nowrap text-[9px] font-bold text-[var(--muted)]">{item.label}</p></div>)}</div>;
}

function SummaryRow({ icon: Icon, label, value }) {
  return <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)] p-4"><span className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><Icon size={17} /> {label}</span><strong>{value}</strong></div>;
}
