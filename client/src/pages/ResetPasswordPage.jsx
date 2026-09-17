import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import PasswordInput from "../components/PasswordInput";
import api from "../services/api";
import { notify } from "../services/notify";
import { AuthShell } from "./LoginPage";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ password: "", passwordConfirmation: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token") || "";

  const submit = async (event) => {
    event.preventDefault();
    if (form.password !== form.passwordConfirmation) return notify("Konfirmasi password belum sama", "error");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, ...form });
      setDone(true); notify(data.message);
    } catch (error) { notify(error.response?.data?.message || error.message, "error"); }
    finally { setLoading(false); }
  };

  return <AuthShell title="Buat password baru" subtitle="Gunakan minimal 6 karakter dan jangan gunakan password lama.">
    {!token ? <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500">Token reset tidak ditemukan.</p> : done ? <div className="text-center"><p className="mb-5 text-sm text-emerald-500">Password berhasil diubah.</p><Link to="/login" className="inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black text-white">Masuk sekarang</Link></div> : <form onSubmit={submit} className="space-y-4"><PasswordInput label="Password baru" minLength={6} autoComplete="new-password" value={form.password} onChange={(password) => setForm({ ...form, password })} /><PasswordInput label="Ulangi password baru" minLength={6} autoComplete="new-password" value={form.passwordConfirmation} onChange={(passwordConfirmation) => setForm({ ...form, passwordConfirmation })} /><button disabled={loading} className="w-full rounded-2xl bg-orange-500 py-3.5 font-black text-white disabled:opacity-50">{loading ? "Menyimpan..." : "Simpan password baru"}</button></form>}
  </AuthShell>;
}
