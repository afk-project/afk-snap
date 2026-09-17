import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

export default function PasswordInput({ label, value, onChange, minLength, autoComplete = "current-password" }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 focus-within:border-orange-400">
        <LockKeyhole size={18} className="text-[var(--muted)]" />
        <input
          required
          minLength={minLength}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent py-3.5 text-sm outline-none"
        />
        <button type="button" onClick={() => setVisible((current) => !current)} className="text-[var(--muted)] hover:text-orange-500" aria-label={visible ? "Sembunyikan password" : "Lihat password"}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
