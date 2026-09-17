import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

export default function GenerationProgress({ job }) {
  if (!job) return null;
  const failed = job.status === "failed";
  const complete = job.status === "completed";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
          {failed ? <XCircle className="text-red-500" /> : complete ? <CheckCircle2 className="text-emerald-500" /> : <LoaderCircle className="animate-spin text-orange-500" />}
          {failed ? "Generation gagal" : complete ? "Foto selesai" : "AI sedang bekerja"}
        </span>
        <span className="text-sm font-black text-orange-500">{job.progress || 0}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className={`h-full rounded-full transition-all duration-500 ${failed ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${job.progress || 0}%` }} />
      </div>
      {job.errorMessage && <p className="mt-2 text-xs text-red-500">{job.errorMessage}</p>}
    </div>
  );
}
