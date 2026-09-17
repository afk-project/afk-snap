import { GoogleLogin } from "@react-oauth/google";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import PasswordInput from "../components/PasswordInput";
import { googleLogin, login } from "../features/authSlice";
import { notify } from "../services/notify";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const { authenticated, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/dashboard";
  if (authenticated) return <Navigate to={destination} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) { notify("Selamat datang kembali!"); navigate(destination, { replace: true }); }
    else notify(result.payload, "error");
  };

  const handleGoogle = async ({ credential }) => {
    const result = await dispatch(googleLogin(credential));
    if (googleLogin.fulfilled.match(result)) { notify("Login Google berhasil"); navigate(destination, { replace: true }); }
    else notify(result.payload, "error");
  };

  return (
    <AuthShell title="Masuk ke AFKSnap" subtitle="Lanjutkan studio dan room foto virtualmu.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field icon={Mail} label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
        <PasswordInput label="Password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <div className="text-right"><Link to="/forgot-password" className="text-xs font-bold text-orange-500 hover:underline">Lupa password?</Link></div>
        <button disabled={loading} className="w-full rounded-2xl bg-orange-500 py-3.5 font-black text-white shadow-lg shadow-orange-500/20 disabled:opacity-50">{loading ? "Memproses..." : "Masuk"}</button>
      </form>
      <Divider />
      {import.meta.env.VITE_GOOGLE_CLIENT_ID ? <div className="flex justify-center"><GoogleLogin onSuccess={handleGoogle} onError={() => notify("Login Google gagal", "error")} /></div> : <p className="rounded-xl bg-[var(--surface-2)] p-3 text-center text-xs text-[var(--muted)]">Isi VITE_GOOGLE_CLIENT_ID untuk mengaktifkan Google Login.</p>}
      <p className="mt-6 text-center text-sm text-[var(--muted)]">Belum punya akun? <Link to="/register" state={location.state} className="font-black text-orange-500">Daftar gratis</Link></p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-4 py-8 text-[var(--text)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between"><Logo /><ThemeToggle /></div>
      <div className="mx-auto mt-10 max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"><ArrowLeft size={16} /> Kembali</Link>
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl shadow-slate-950/5 sm:p-9">
          <h1 className="text-3xl font-black">{title}</h1><p className="mb-7 mt-2 text-sm text-[var(--muted)]">{subtitle}</p>{children}
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, type, value, onChange }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><span className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 focus-within:border-orange-400"><Icon size={18} className="text-[var(--muted)]" /><input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent py-3.5 text-sm outline-none" /></span></label>;
}

function Divider() { return <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--border)]" />atau<span className="h-px flex-1 bg-[var(--border)]" /></div>; }
