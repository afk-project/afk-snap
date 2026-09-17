import { ArrowDownRight, ArrowUpRight, Coins, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBalance, fetchTransactions } from "../features/walletSlice";

export default function CreditsPage() {
  const { balance, transactions } = useSelector((state) => state.wallet);
  const dispatch = useDispatch();
  useEffect(() => { dispatch(fetchBalance()); dispatch(fetchTransactions()); }, [dispatch]);
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7"><p className="text-sm font-black uppercase tracking-[.2em] text-orange-500">Wallet</p><h1 className="mt-2 text-3xl font-black">Credit AFKSnap</h1><p className="mt-2 text-sm text-[var(--muted)]">Semua pemakaian tercatat sebagai ledger sehingga saldo mudah diaudit.</p></div>
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-700 p-7 text-white"><Coins className="absolute -right-8 -top-8 size-44 opacity-10" /><p className="text-sm font-bold text-orange-100">Saldo tersedia</p><p className="mt-2 text-5xl font-black">{balance}</p><p className="mt-4 flex items-center gap-2 text-sm text-orange-100"><ShieldCheck size={17} /> Refund otomatis jika AI gagal memproses.</p></section>
      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="font-black">Riwayat transaksi</h2><div className="mt-4 divide-y divide-[var(--border)]">{transactions.map((item) => { const positive = item.amount > 0; return <div key={item.id} className="flex items-center gap-4 py-4"><span className={`grid size-11 place-items-center rounded-2xl ${positive ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"}`}>{positive ? <ArrowDownRight /> : <ArrowUpRight />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.description || item.type}</p><p className="text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString("id-ID")}</p></div><span className={`font-black ${positive ? "text-emerald-500" : "text-orange-500"}`}>{positive ? "+" : ""}{item.amount}</span></div>; })}{!transactions.length && <p className="py-8 text-center text-sm text-[var(--muted)]">Belum ada transaksi.</p>}</div></section>
    </div>
  );
}
