import { Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AuthShell } from "./LoginPage";
import api from "../services/api";
import { notify } from "../services/notify";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDevResetUrl(data.devResetUrl || "");
      notify(data.message);
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    } finally { setLoading(false); }
  };

  return <AuthShell title="Lupa password" subtitle="Masukkan email akunmu. Tautan berlaku selama 30 menit.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-2 block text-sm font-bold">Email</span><span className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4"><Mail size={18} className="text-[var(--muted)]" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent py-3.5 text-sm outline-none" /></span></label>
      <button disabled={loading} className="w-full rounded-2xl bg-orange-500 py-3.5 font-black text-white disabled:opacity-50">{loading ? "Mengirim..." : "Kirim tautan reset"}</button>
    </form>
    {devResetUrl && <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><p className="font-black text-amber-500">Mode development</p><p className="my-2 text-xs text-[var(--muted)]">Layanan email belum dipasang, gunakan tautan uji berikut.</p><a href={devResetUrl} className="break-all font-bold text-orange-500 underline">Buka halaman reset</a></div>}
    <p className="mt-6 text-center text-sm"><Link to="/login" className="font-black text-orange-500">Kembali ke login</Link></p>
  </AuthShell>;
}
