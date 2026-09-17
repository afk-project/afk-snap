import { Check, Circle, Crown } from "lucide-react";

export default function ParticipantsPanel({ room }) {
  const slots = Array.isArray(room?.memberships) ? room.memberships : [];
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black text-[var(--text)]">Peserta</h2>
        <span className="text-xs font-bold text-[var(--muted)]">{slots.length}/{room?.maxParticipants || 6}</span>
      </div>
      <div className="space-y-3">
        {slots.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
            <div className={`avatar-${member.user?.avatarAnimation || "none"} grid size-10 place-items-center overflow-hidden rounded-full bg-orange-500 font-black text-white`}>
              {member.user?.avatarUrl ? <img src={member.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : member.user?.name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--text)]">{member.user?.name}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--muted)]">{member.role === "owner" && <Crown size={12} className="text-orange-500" />} {member.role}</p>
            </div>
            {member.ready ? <Check size={18} className="text-emerald-500" /> : <Circle size={15} className="text-[var(--muted)]" />}
          </div>
        ))}
      </div>
    </section>
  );
}
