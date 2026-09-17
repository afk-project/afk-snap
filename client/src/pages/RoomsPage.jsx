import { ArrowRight, Clock3, Copy, DoorOpen, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import { createRoom, fetchRooms, joinRoom } from "../features/roomSlice";
import { notify } from "../services/notify";

export default function RoomsPage() {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const rooms = useSelector((state) => state.rooms.items);
  const loading = useSelector((state) => state.rooms.loading);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchRooms());
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

  const copyInvite = async (room) => {
    await navigator.clipboard.writeText(`${window.location.origin}/rooms/join/${room.code}`);
    notify("Link undangan room disalin");
  };

  return (
    <div className="space-y-7">
      <div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Virtual Room</p><h1 className="mt-2 text-3xl font-black">Foto dan ngobrol bareng teman.</h1><p className="mt-2 text-sm text-[var(--muted)]">Buat room, bagikan link, lalu gunakan chat dan Open Camera secara realtime.</p></div>

      <section className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-500"><Plus /></span><h2 className="mt-5 text-xl font-black">Buat room baru</h2><p className="mt-1 text-sm text-[var(--muted)]">Maksimal enam peserta dalam satu sesi.</p>
          <div className="mt-5 flex gap-2"><input required value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Contoh: Reuni Kelas" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm outline-none focus:border-orange-400" /><button disabled={loading} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50">Buat</button></div>
        </form>
        <form onSubmit={handleJoin} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-500"><DoorOpen /></span><h2 className="mt-5 text-xl font-black">Gabung dengan kode</h2><p className="mt-1 text-sm text-[var(--muted)]">Atau buka link undangan yang dibagikan pemilik room.</p>
          <div className="mt-5 flex gap-2"><input required maxLength={12} value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="KODE ROOM" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-mono text-sm uppercase outline-none focus:border-blue-400" /><button disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">Gabung</button></div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black">Room saya</h2>
        {rooms.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => (
          <article key={room.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-500">{room.status}</span><span className="font-mono text-xs text-[var(--muted)]">{room.code}</span></div>
            <h3 className="mt-5 text-lg font-black">{room.name}</h3><p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><Users size={15} /> {room.memberships?.length || 0}/{room.maxParticipants} peserta</p>{room.expiresAt && <p className="mt-1 flex items-center gap-1 text-xs text-amber-500"><Clock3 size={13} /> {room.status === "closed" ? "Sudah berakhir" : `Aktif sampai ${new Date(room.expiresAt).toLocaleString("id-ID")}`}</p>}
            <div className="mt-5 flex gap-2">{room.status === "closed" ? <span className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--surface-2)] px-3 py-2.5 text-sm font-black text-[var(--muted)]">Room ditutup</span> : <Link to={`/rooms/${room.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-black text-white">Buka <ArrowRight size={16} /></Link>}<button type="button" disabled={room.status === "closed"} onClick={() => copyInvite(room)} className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] disabled:opacity-40" title="Salin link undangan"><Copy size={16} /></button></div>
          </article>
        ))}</div> : <div className="rounded-3xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">Belum ada room. Buat room pertama kamu di atas.</div>}
      </section>
    </div>
  );
}
