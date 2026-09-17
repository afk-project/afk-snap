import { Download, Image as ImageIcon, Printer, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router";
import GenerationProgress from "../components/GenerationProgress";
import { fetchGenerations } from "../features/generationSlice";
import { assetUrl } from "../services/api";
import { downloadImage, printImage } from "../utils/exportImage";

export default function CreationsPage() {
  const { items, active } = useSelector((state) => state.generations);
  const dispatch = useDispatch();
  useEffect(() => { dispatch(fetchGenerations()); dispatch({ type: "socket/connect" }); }, [dispatch]);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[.2em] text-orange-500">Galeri pribadi</p><h1 className="mt-2 text-3xl font-black">Kreasi AFKSnap</h1><p className="mt-2 text-sm text-[var(--muted)]">Unduh untuk Instagram atau cetak sebagai kartu.</p></div><button onClick={() => dispatch(fetchGenerations())} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold"><RefreshCcw size={16} /> Segarkan</button></div>
      {active && !["completed", "failed"].includes(active.status) && <div className="mb-6"><GenerationProgress job={active} /></div>}
      {items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((job) => <article key={job.id} className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]"><div className="relative aspect-square bg-[var(--surface-2)]">{job.resultUrl ? <img src={assetUrl(job.resultUrl)} alt={`Kreasi ${job.style}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><GenerationProgress job={job} /></div>}<span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold capitalize text-white">{job.format}</span>{job.resultUrl?.includes("demo-afksnap") && <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-slate-950">DEMO</span>}</div><div className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-black capitalize">{job.style}</h2><p className="text-xs text-[var(--muted)]">{new Date(job.createdAt).toLocaleString("id-ID")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${job.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : job.status === "failed" ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"}`}>{job.status}</span></div>{job.resultUrl && <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => downloadImage(job.resultUrl, `afksnap-${job.id}`, job.format)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-bold text-white"><Download size={16} /> Unduh</button><button onClick={() => printImage(job.resultUrl)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm font-bold"><Printer size={16} /> Cetak</button></div>}</div></article>)}</div> : <div className="rounded-3xl border border-dashed border-[var(--border)] p-14 text-center"><ImageIcon className="mx-auto mb-4 text-[var(--muted)]" size={44} /><h2 className="font-black">Galeri masih kosong</h2><p className="mt-2 text-sm text-[var(--muted)]">Kreasi pertamamu akan tampil di sini.</p><Link to="/studio" className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Buka studio</Link></div>}
    </div>
  );
}
