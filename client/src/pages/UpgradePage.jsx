import { Check, Clock3, Crown, Gem, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "../features/authSlice";
import { fetchBalance } from "../features/walletSlice";
import api from "../services/api";
import { notify } from "../services/notify";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const packageFeatures = {
  free: ["10 credit awal", "Studio sendiri", "Virtual room 24 jam"],
  pro: ["200 credit", "Semua gaya AI", "Story, card, dan cetak"],
  max: ["1.000 credit", "Hemat Rp350.000", "Cocok untuk komunitas/tim"],
};

export default function UpgradePage() {
  const [packages, setPackages] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [environment, setEnvironment] = useState("sandbox");
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [orders, setOrders] = useState([]);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  const loadOrders = async () => {
    const { data } = await api.get("/payments/orders");
    setOrders(data.orders || []);
  };

  const refreshAccount = async ({ quiet = false, orderId = localStorage.getItem("afksnap_pending_order") } = {}) => {
    setSyncing(true);
    try {
      const { data } = await api.post("/payments/sync", orderId ? { orderId } : {});
      await Promise.all([dispatch(fetchMe()).unwrap(), dispatch(fetchBalance()).unwrap(), loadOrders()]);
      const detail = data.results?.[0];
      if (["paid", "expired", "cancelled", "failed"].includes(data.status)) localStorage.removeItem("afksnap_pending_order");
      if (!quiet || data.credited) {
        if (data.credited) notify(`Pembayaran terverifikasi. Credit sekarang ${data.balance.toLocaleString("id-ID")}.`);
        else if (data.status === "paid") notify("Pembayaran sudah pernah diproses. Saldo sudah terbaru.");
        else if (data.status === "pending") notify(`Pembayaran masih ${detail?.transactionStatus || "pending"} di Midtrans. Selesaikan settlement lalu segarkan lagi.`, "error");
        else if (detail?.message) notify(detail.message, "error");
        else notify("Belum ada pembayaran baru yang dapat diproses.", "error");
      }
      return data;
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
      return null;
    } finally {
      setSyncing(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedOrderId = params.get("order_id") || localStorage.getItem("afksnap_pending_order");
    api.get("/payments/packages").then(({ data }) => { setPackages(data.packages); setConfigured(data.midtransConfigured); setEnvironment(data.midtransEnvironment || "sandbox"); }).catch((error) => notify(error.response?.data?.message || error.message, "error"));
    loadOrders().catch((error) => notify(error.response?.data?.message || error.message, "error"));
    if (params.has("payment")) {
      refreshAccount({ orderId: returnedOrderId });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkout = async (plan) => {
    setCheckoutPlan(plan);
    try {
      const { data } = await api.post("/payments/checkout", { plan });
      localStorage.setItem("afksnap_pending_order", data.order.orderId);
      window.location.assign(data.redirectUrl);
    } catch (error) { notify(error.response?.data?.message || error.message, "error"); setCheckoutPlan(""); }
  };

  return <div className="space-y-7">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Upgrade Paket</p><h1 className="mt-2 text-3xl font-black">Pilih credit sesuai kreasimu.</h1><p className="mt-1 text-sm text-[var(--muted)]">Pembayaran aman melalui Midtrans Snap. Credit masuk setelah pembayaran terverifikasi.</p><span className="mt-2 inline-flex rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-500">Midtrans {environment}</span></div><button disabled={syncing} onClick={() => refreshAccount({ orderId: null })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-black disabled:opacity-50"><RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> {syncing ? "Memeriksa..." : "Segarkan credit"}</button></section>
    {!configured && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600"><strong>Mode tampilan:</strong> isi <code>MIDTRANS_SERVER_KEY</code> di server/.env untuk mengaktifkan tombol pembayaran Sandbox.</div>}
    <div className="grid gap-5 lg:grid-cols-3">
      {packages.map((item) => {
        const active = (user?.plan || "free") === item.id;
        const featured = item.id === "max";
        return <article key={item.id} className={`relative overflow-hidden rounded-3xl border bg-[var(--surface)] p-6 ${featured ? "border-orange-500 shadow-xl shadow-orange-500/10" : "border-[var(--border)]"}`}>
          {featured && <span className="absolute right-0 top-0 rounded-bl-2xl bg-orange-500 px-4 py-2 text-xs font-black text-white">HEMAT 35%</span>}
          <div className={`grid size-12 place-items-center rounded-2xl ${featured ? "bg-orange-500 text-white" : "bg-[var(--surface-2)] text-orange-500"}`}>{item.id === "max" ? <Crown /> : item.id === "pro" ? <Gem /> : <Sparkles />}</div>
          <h2 className="mt-5 text-2xl font-black">{item.name}</h2><p className="mt-1 text-sm font-bold text-orange-500">{item.credits.toLocaleString("id-ID")} credit</p>
          <div className="mt-5 min-h-14">{item.originalAmount > item.amount && <p className="text-sm text-[var(--muted)] line-through">{rupiah.format(item.originalAmount)}</p>}<p className="text-3xl font-black">{item.amount ? rupiah.format(item.amount) : "Gratis"}</p></div>
          <ul className="my-6 space-y-3">{packageFeatures[item.id].map((feature) => <li key={feature} className="flex items-center gap-2 text-sm"><Check size={17} className="text-emerald-500" /> {feature}</li>)}</ul>
          {item.id === "free" ? <button disabled className="w-full rounded-2xl bg-[var(--surface-2)] py-3 font-black text-[var(--muted)]">{active ? "Paket aktif" : "Paket dasar"}</button> : <button disabled={!configured || checkoutPlan === item.id} onClick={() => checkout(item.id)} className="w-full rounded-2xl bg-orange-500 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{checkoutPlan === item.id ? "Membuka Midtrans..." : active ? "Beli credit lagi" : `Pilih ${item.name}`}</button>}
        </article>;
      })}
    </div>
    {!!orders.length && <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-orange-500" /><h2 className="font-black">Riwayat pembayaran terakhir</h2></div><div className="space-y-3">{orders.slice(0, 5).map((order) => <div key={order.orderId} className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs font-black">{order.orderId}</p><p className="mt-1 text-xs text-[var(--muted)]">Paket {order.plan.toUpperCase()} · {rupiah.format(order.amount)} · {new Date(order.createdAt).toLocaleString("id-ID")}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-black ${order.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : order.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>{order.status}</span>{order.status !== "paid" && <button disabled={syncing} onClick={() => refreshAccount({ orderId: order.orderId })} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black disabled:opacity-50">Cek status</button>}</div></div>)}</div></section>}
    <p className="flex items-center justify-center gap-2 text-center text-xs text-[var(--muted)]"><ShieldCheck size={15} /> Status paket dan credit diperbarui dari webhook atau pemeriksaan status langsung ke Midtrans.</p>
  </div>;
}
