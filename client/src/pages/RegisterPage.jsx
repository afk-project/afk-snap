import { CalendarDays, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { register } from "../features/authSlice";
import { notify } from "../services/notify";
import { AuthShell } from "./LoginPage";
import PasswordInput from "../components/PasswordInput";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", birthday: "", password: "", passwordConfirmation: "" });
  const { authenticated, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/dashboard";
  if (authenticated) return <Navigate to={destination} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.passwordConfirmation) return notify("Konfirmasi password belum sama", "error");
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) { notify("Akun dibuat. Kamu mendapat 10 credit!"); navigate(destination, { replace: true }); }
    else notify(result.payload, "error");
  };

  return (
    <AuthShell title="Buat akun AFKSnap" subtitle="Dapatkan 10 credit awal dan mulai membuat foto.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input icon={UserRound} label="Nama" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input icon={Mail} label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Input icon={CalendarDays} label="Tanggal lahir (opsional)" type="date" required={false} value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        <PasswordInput label="Password" minLength={6} autoComplete="new-password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        <PasswordInput label="Ulangi password" minLength={6} autoComplete="new-password" value={form.passwordConfirmation} onChange={(passwordConfirmation) => setForm({ ...form, passwordConfirmation })} />
        {form.passwordConfirmation && <p className={`text-xs font-bold ${form.password === form.passwordConfirmation ? "text-emerald-500" : "text-red-500"}`}>{form.password === form.passwordConfirmation ? "Password sudah sama" : "Password belum sama"}</p>}
        <button disabled={loading} className="w-full rounded-2xl bg-orange-500 py-3.5 font-black text-white shadow-lg shadow-orange-500/20 disabled:opacity-50">{loading ? "Membuat akun..." : "Daftar & dapatkan 10 credit"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">Sudah punya akun? <Link to="/login" state={location.state} className="font-black text-orange-500">Masuk</Link></p>
    </AuthShell>
  );
}

function Input({ icon: Icon, label, type = "text", value, onChange, minLength, required = true }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><span className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 focus-within:border-orange-400"><Icon size={18} className="text-[var(--muted)]" /><input required={required} minLength={minLength} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent py-3.5 text-sm outline-none" /></span></label>;
}
