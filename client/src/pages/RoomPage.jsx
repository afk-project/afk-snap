import { ArrowLeft, Camera, Check, Clock3, Copy, ExternalLink, Link2, Radio, Trash2, Upload, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router";
import ChatPanel from "../components/ChatPanel";
import CameraCapture from "../components/CameraCapture";
import GenerationProgress from "../components/GenerationProgress";
import LoadingScreen from "../components/LoadingScreen";
import ParticipantsPanel from "../components/ParticipantsPanel";
import { getPhotoTemplatesByLayout } from "../constants/photoTemplates";
import { clearChat, fetchMessages } from "../features/chatSlice";
import { fetchRoom } from "../features/roomSlice";
import api, { assetUrl } from "../services/api";
import { notify } from "../services/notify";

export default function RoomPage() {
  const { roomId } = useParams();
  const [uploading, setUploading] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(2);
  const [selectedTemplate, setSelectedTemplate] = useState("foto-dulu");
  const currentRoom = useSelector((state) => state.rooms.current);
  const loading = useSelector((state) => state.rooms.loading);
  const roomError = useSelector((state) => state.rooms.error);
  const activeJob = useSelector((state) => state.generations.active);
  const cameraStates = useSelector((state) => state.rooms.cameraStates);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const room = currentRoom?.id === Number(roomId) ? currentRoom : null;
  const roomTemplates = getPhotoTemplatesByLayout(selectedLayout);

  useEffect(() => {
    dispatch(clearChat());
    dispatch(fetchRoom(roomId));
    dispatch(fetchMessages(roomId));
    dispatch({ type: "socket/connect" });
    dispatch({ type: "socket/joinRoom", payload: { roomId: Number(roomId) } });
  }, [dispatch, roomId]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    notify("Kode room disalin");
  };
  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/rooms/join/${room.code}`);
    notify("Link undangan disalin. Kirim ke temanmu.");
  };
  const uploadPhotoFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      await api.post(`/rooms/${roomId}/photos`, form);
      notify("Foto kamu masuk ke room");
      dispatch(fetchRoom(roomId));
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
      throw error;
    } finally {
      setUploading(false);
    }
  };
  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    try {
      await uploadPhotoFile(file);
    } finally {
      event.target.value = "";
    }
  };

  const selectLayout = (layout) => {
    const templates = getPhotoTemplatesByLayout(layout);
    setSelectedLayout(layout);
    setSelectedTemplate(templates[0]?.id || "");
  };

  const deletePhoto = async (asset) => {
    try {
      await api.delete(`/rooms/${roomId}/photos/${asset.id}`);
      await dispatch(fetchRoom(roomId));
      notify("Foto berhasil dihapus. Kamu bisa mengambil foto ulang.");
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    }
  };

  if (loading && !room) return <LoadingScreen label="Masuk ke room..." />;
  if (!room) return <section className="rounded-3xl border border-red-500/30 bg-[var(--surface)] p-8 text-center"><h1 className="text-2xl font-black">Room tidak dapat dibuka</h1><p className="mt-2 text-sm text-[var(--muted)]">{roomError || "Room tidak ditemukan atau kamu belum menjadi anggota."}</p><Link to="/rooms" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-black text-white"><ArrowLeft size={17} /> Kembali ke Rooms</Link></section>;
  if (room.status === "closed") return <section className="rounded-3xl border border-amber-500/30 bg-[var(--surface)] p-8 text-center"><Clock3 className="mx-auto text-amber-500" size={42} /><h1 className="mt-4 text-2xl font-black">Room sudah berakhir</h1><p className="mt-2 text-sm text-[var(--muted)]">Room otomatis ditutup 24 jam setelah dibuat. Buat room baru untuk melanjutkan sesi.</p><Link to="/rooms" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-black text-white"><ArrowLeft size={17} /> Buat room baru</Link></section>;
  const assets = Array.isArray(room.assets) ? room.assets : [];
  const activeTemplate = roomTemplates.find((template) => template.id === selectedTemplate) || roomTemplates[0];
  const activeCameras = Object.values(cameraStates || {}).filter((camera) => Number(camera.roomId) === Number(roomId));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Virtual Photo Room</p><h1 className="mt-2 text-3xl font-black">{room.name}</h1><p className="mt-1 text-sm text-[var(--muted)]">Pemilik: {room.owner?.name}</p>{room.expiresAt && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-500"><Clock3 size={13} /> Berakhir {new Date(room.expiresAt).toLocaleString("id-ID")}</p>}</div>
        <div className="flex flex-wrap gap-2"><button onClick={copyCode} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 font-mono text-sm font-black"><Copy size={16} /> {room.code}</button><button onClick={copyInviteLink} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-500"><Link2 size={16} /> Salin link teman</button><Link to={`/studio?roomId=${room.id}&template=${selectedTemplate}&layout=${selectedLayout}`} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white"><WandSparkles size={17} /> Camera + Template</Link></div>
      </section>

      <GenerationProgress job={activeJob?.roomId === room.id ? activeJob : null} />

      <section className="rounded-3xl border border-orange-400/30 bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-500"><Radio size={15} className="animate-pulse" /> Live Virtual Camera</p><h2 className="mt-2 text-xl font-black">Open camera bareng dari room</h2><p className="mt-1 text-sm text-[var(--muted)]">Setiap kamera berjalan di perangkat masing-masing. Hasil jepretan langsung tersinkron ke semua peserta melalui Socket.IO.</p></div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-500">{activeCameras.length} kamera aktif</span>
        </div>
        {!!activeCameras.length && <div className="mb-4 flex flex-wrap gap-2">{activeCameras.map((camera) => <span key={camera.userId} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500">● {camera.name}</span>)}</div>}
        <div className="mb-5">
          <p className="mb-3 text-xs font-black uppercase tracking-[.16em] text-[var(--muted)]">Jumlah frame</p>
          <div className="mb-5 grid grid-cols-4 gap-2 sm:max-w-md">
            {[1, 2, 3, 6].map((layout) => <button key={layout} type="button" onClick={() => selectLayout(layout)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${selectedLayout === layout ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"}`}>{layout} frame</button>)}
          </div>
          <p className="mb-3 text-xs font-black uppercase tracking-[.16em] text-[var(--muted)]">Template hasil foto</p>
          <div className="flex gap-3 overflow-x-auto pb-2">{roomTemplates.map((template) => <button key={template.id} type="button" onClick={() => setSelectedTemplate(template.id)} className={`w-20 shrink-0 overflow-hidden rounded-xl border text-left ${selectedTemplate === template.id ? "border-orange-500 ring-2 ring-orange-500/20" : "border-[var(--border)]"}`}><img src={template.src} alt={template.name} className="aspect-[9/16] w-full bg-slate-950 object-cover" /><span className="block truncate bg-[var(--surface-2)] px-2 py-1.5 text-[9px] font-bold">{template.name}</span></button>)}</div>
          <p className="mt-2 text-xs text-[var(--muted)]">Foto kamera masuk ke photo roll room. Template terpilih otomatis dibawa saat membuka Camera Studio.</p>
        </div>
        <CameraCapture
          onCapture={uploadPhotoFile}
          onCameraStateChange={(active) => dispatch({ type: "socket/cameraState", payload: { roomId: Number(roomId), active } })}
          overlayTemplate={activeTemplate}
          capturedCount={assets.length}
          maxShots={6}
          disabled={uploading || assets.length >= 6}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-6">
          <ParticipantsPanel room={room} />
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-black">Foto room</h2><p className="mt-1 text-xs text-[var(--muted)]">Satu foto wajah terbaik per peserta.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange-400/50 bg-orange-500/5 p-4 text-sm font-black text-orange-500 hover:bg-orange-500/10"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="hidden" /><Upload size={17} />{uploading ? "Mengunggah..." : "Unggah foto saya"}</label>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {assets.map((asset) => {
                const canDelete = asset.userId === user?.id || room.ownerId === user?.id || user?.role === "admin";
                return <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]"><a href={assetUrl(asset.url)} target="_blank" rel="noreferrer" className="absolute inset-0"><img src={assetUrl(asset.url)} alt="Foto peserta" className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-slate-950/40 text-white opacity-0 transition group-hover:opacity-100"><ExternalLink size={16} /></span></a>{canDelete && <button type="button" onClick={() => deletePhoto(asset)} className="absolute right-1.5 top-1.5 z-10 grid size-8 place-items-center rounded-lg bg-red-500 text-white shadow-lg transition hover:bg-red-600" title="Hapus foto"><Trash2 size={15} /></button>}</div>;
              })}
              {!assets.length && <div className="col-span-3 rounded-xl bg-[var(--surface-2)] p-5 text-center text-xs text-[var(--muted)]"><Camera className="mx-auto mb-2" />Belum ada foto</div>}
            </div>
            {!!assets.length && <p className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-500"><Check size={14} /> {assets.length} foto siap diproses</p>}
          </section>
        </div>
        <ChatPanel roomId={Number(roomId)} />
      </div>
    </div>
  );
}
