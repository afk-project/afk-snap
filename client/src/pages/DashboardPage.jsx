import { ArrowRight, Clock3, ImagePlus, Plus, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import { fetchGenerations } from "../features/generationSlice";
import { createRoom, fetchRooms, joinRoom } from "../features/roomSlice";
import { fetchBalance } from "../features/walletSlice";
import { assetUrl } from "../services/api";
import { notify } from "../services/notify";

export default function DashboardPage() {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const rooms = useSelector((state) => state.rooms.items);
  const jobs = useSelector((state) => state.generations.items);
  const balance = useSelector((state) => state.wallet.balance);

  useEffect(() => {
    dispatch(fetchRooms());
    dispatch(fetchGenerations());
    dispatch(fetchBalance());
    dispatch({ type: "socket/connect" });
  }, [dispatch]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const result = await dispatch(createRoom({ name: roomName, maxParticipants: 6 }));
    if (createRoom.fulfilled.match(result)) navigate(`/rooms/${result.payload.id}`);
    else notify(result.payload, "error");
  };
  const handleJoin = async (event) => {
    event.preventDefault();
    const result = await dispatch(joinRoom(roomCode));
    if (joinRoom.fulfilled.match(result)) navigate(`/rooms/${result.payload.id}`);
    else notify(result.payload, "error");
  };

  const completed = jobs.filter((job) => job.status === "completed");
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-orange-900 p-7 text-white sm:p-10">
        <div className="absolute -right-16 -top-20 size-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative max-w-2xl"><p className="text-sm font-bold text-orange-300">Halo, {user?.name} 👋</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Mau bikin kenangan apa hari ini?</h1><p className="mt-3 text-sm leading-relaxed text-slate-300">Mulai studio sendiri atau undang teman ke room virtual. AI akan menyatukan fotonya.</p><Link to="/studio" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-black text-white">Buka AI Studio <ArrowRight size={18} /></Link></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Sparkles} label="Credit tersedia" value={balance} color="orange" />
        <Stat icon={Users} label="Room aktif" value={rooms.filter((room) => room.status === "active").length} color="blue" />
        <Stat icon={ImagePlus} label="Kreasi selesai" value={completed.length} color="emerald" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-500"><Plus /></span><h2 className="mt-5 text-xl font-black">Buat room foto</h2><p className="mt-1 text-sm text-[var(--muted)]">Undang maksimal 5 teman dan ngobrol realtime.</p>
          <div className="mt-5 flex gap-2"><input required value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Contoh: Reuni Kelas" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm outline-none focus:border-orange-400" /><button className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-white">Buat</button></div>
        </form>
        <form onSubmit={handleJoin} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-500"><Users /></span><h2 className="mt-5 text-xl font-black">Gabung dengan kode</h2><p className="mt-1 text-sm text-[var(--muted)]">Masukkan kode undangan dari pemilik room.</p>
          <div className="mt-5 flex gap-2"><input required maxLength={12} value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="KODE ROOM" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-mono text-sm uppercase outline-none focus:border-blue-400" /><button className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Gabung</button></div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-black uppercase tracking-widest text-orange-500">Lanjutkan bersama</p><h2 className="mt-1 text-2xl font-black">Room terbaru</h2></div></div>
        {rooms.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rooms.slice(0, 6).map((room) => <Link key={room.id} to={`/rooms/${room.id}`} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-orange-400"><div className="flex items-center justify-between"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">{room.status}</span><span className="font-mono text-xs text-[var(--muted)]">{room.code}</span></div><h3 className="mt-5 font-black">{room.name}</h3><p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><Users size={15} /> {room.memberships?.length || 0}/{room.maxParticipants} peserta</p></Link>)}</div> : <Empty text="Belum ada room. Buat room pertamamu di atas." />}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-black uppercase tracking-widest text-orange-500">Galeri singkat</p><h2 className="mt-1 text-2xl font-black">Kreasi terakhir</h2></div><Link to="/creations" className="text-sm font-bold text-orange-500">Lihat semua</Link></div>
        {completed.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{completed.slice(0, 4).map((job) => <Link key={job.id} to="/creations" className="group relative aspect-square overflow-hidden rounded-3xl bg-[var(--surface-2)]"><img src={assetUrl(job.resultUrl)} alt="Hasil AFKSnap" className="h-full w-full object-cover transition group-hover:scale-105" /><span className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white">{job.style}</span></Link>)}</div> : <Empty text="Belum ada hasil. Coba generate dari AI Studio." />}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  const colorMap = { orange: "bg-orange-500/10 text-orange-500", blue: "bg-blue-500/10 text-blue-500", emerald: "bg-emerald-500/10 text-emerald-500" };
  return <div className="flex items-center gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className={`grid size-12 place-items-center rounded-2xl ${colorMap[color]}`}><Icon /></span><div><p className="text-2xl font-black">{value}</p><p className="text-xs text-[var(--muted)]">{label}</p></div></div>;
}
function Empty({ text }) { return <div className="rounded-3xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]"><Clock3 className="mx-auto mb-3" />{text}</div>; }
