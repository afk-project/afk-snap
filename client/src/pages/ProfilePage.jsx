import { CalendarDays, Mail, Save, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateProfile } from "../features/authSlice";
import { notify } from "../services/notify";

const animations = [
  { id: "none", name: "Tanpa animasi" },
  { id: "float", name: "Melayang" },
  { id: "pulse", name: "Pulse" },
  { id: "bounce", name: "Bounce" },
];

export default function ProfilePage() {
  const { user, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: "", birthday: "", avatarAnimation: "float" });

  useEffect(() => {
    if (user) setForm({ name: user.name || "", birthday: user.birthday || "", avatarAnimation: user.avatarAnimation || "float" });
  }, [user]);

  const submit = async (event) => {
    event.preventDefault();
    const result = await dispatch(updateProfile(form));
    notify(updateProfile.fulfilled.match(result) ? "Profil berhasil diperbarui" : result.payload, updateProfile.fulfilled.match(result) ? "success" : "error");
  };

  return <div className="mx-auto max-w-4xl space-y-6">
    <section><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Akun AFKSnap</p><h1 className="mt-2 text-3xl font-black">Profil saya</h1><p className="mt-1 text-sm text-[var(--muted)]">Atur identitas dan animasi avatar yang tampil di AFKSnap.</p></section>
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <div className={`avatar-${form.avatarAnimation} mx-auto grid size-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-violet-600 text-4xl font-black text-white shadow-xl shadow-orange-500/20`}>
          {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase()}
        </div>
        <h2 className="mt-5 text-xl font-black">{form.name || "AFKSnap User"}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{user?.email}</p>
        <span className="mt-4 inline-flex rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black uppercase text-orange-500">Paket {user?.plan || "free"}</span>
      </section>
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <ProfileField icon={UserRound} label="Nama" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <ProfileField icon={Mail} label="Email (tidak dapat diubah)" type="email" value={user?.email || ""} disabled />
        <ProfileField icon={CalendarDays} label="Tanggal lahir (opsional)" type="date" value={form.birthday} onChange={(birthday) => setForm({ ...form, birthday })} />
        <div><p className="mb-3 flex items-center gap-2 text-sm font-bold"><Sparkles size={17} /> Animasi avatar</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{animations.map((animation) => <button type="button" key={animation.id} onClick={() => setForm({ ...form, avatarAnimation: animation.id })} className={`rounded-xl border px-3 py-3 text-xs font-black transition ${form.avatarAnimation === animation.id ? "border-orange-500 bg-orange-500 text-white" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>{animation.name}</button>)}</div></div>
        <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-black text-white disabled:opacity-50"><Save size={18} /> {loading ? "Menyimpan..." : "Simpan profil"}</button>
      </form>
    </div>
  </div>;
}

function ProfileField({ icon: Icon, label, value, onChange, type = "text", disabled = false }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><span className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4"><Icon size={18} className="text-[var(--muted)]" /><input required={type !== "date"} disabled={disabled} type={type} value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full bg-transparent py-3.5 text-sm outline-none disabled:opacity-60" /></span></label>;
}
