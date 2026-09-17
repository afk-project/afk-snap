import { Camera, Coins, Download, Layers3, LoaderCircle, Sparkles, Trash2, Users, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router";
import CameraCapture from "../components/CameraCapture";
import GenerationProgress from "../components/GenerationProgress";
import PhotoStripPreview from "../components/PhotoStripPreview";
import PhotoUploader from "../components/PhotoUploader";
import { calculateGenerationCost, generationOptions, getGenerationOption } from "../constants/generationOptions";
import { getPhotoTemplate, getPhotoTemplatesByLayout } from "../constants/photoTemplates";
import { createGeneration } from "../features/generationSlice";
import { fetchRoom } from "../features/roomSlice";
import { updateStudio } from "../features/studioSlice";
import { setBalance } from "../features/walletSlice";
import api, { assetUrl, serverUrl } from "../services/api";
import { notify } from "../services/notify";
import { downloadPhotoStrip } from "../utils/photoStrip";

export default function StudioPage() {
  const [files, setFiles] = useState([]);
  const [uploadingRoom, setUploadingRoom] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const settings = useSelector((state) => state.studio);
  const { active, loading } = useSelector((state) => state.generations);
  const currentRoom = useSelector((state) => state.rooms.current);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const templateId = searchParams.get("template");
  const layoutParam = Number(searchParams.get("layout"));
  const room = currentRoom?.id === Number(roomId) ? currentRoom : null;
  const roomAssets = useMemo(() => room?.assets || [], [room]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  const roomPhotoUrls = useMemo(() => roomAssets.map((asset) => assetUrl(asset.url)), [roomAssets]);
  const stripPhotos = roomId ? roomPhotoUrls : previews;
  const compatibleTemplates = useMemo(() => getPhotoTemplatesByLayout(settings.layout), [settings.layout]);
  const selectedFrame = compatibleTemplates.find((template) => template.id === settings.frameTemplate) || compatibleTemplates[0] || null;
  const selectedGeneration = getGenerationOption(settings.generationType);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview)), [previews]);

  useEffect(() => {
    fetch(`${serverUrl}/health`).then((response) => response.json()).then(setAiStatus).catch(() => setAiStatus({ aiMode: "offline", aiConfigured: false }));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const requestedTemplate = templateId ? getPhotoTemplate(templateId) : null;
    const requestedLayout = [1, 2, 3, 6].includes(layoutParam) ? layoutParam : requestedTemplate?.slots?.length || 2;
    dispatch(updateStudio({ mode: "group", generationType: "together-real", style: "photorealistic", layout: requestedLayout, ...(requestedTemplate ? { frameTemplate: requestedTemplate.id, format: requestedTemplate.canvas?.height > requestedTemplate.canvas?.width ? "story" : "square" } : {}) }));
    dispatch(fetchRoom(roomId));
    dispatch({ type: "socket/connect" });
    dispatch({ type: "socket/joinRoom", payload: { roomId: Number(roomId) } });
  }, [dispatch, layoutParam, roomId, templateId]);

  const validateFiles = (incoming) => {
    const images = incoming.filter((file) => file.type.startsWith("image/"));
    if (images.length !== incoming.length) notify("File harus berupa gambar", "error");
    if (images.some((file) => file.size > 8 * 1024 * 1024)) {
      notify("Ukuran tiap foto maksimal 8 MB", "error");
      return [];
    }
    return images;
  };

  const uploadRoomPhotos = async (incoming) => {
    const availableSlots = Math.max(0, 6 - roomAssets.length);
    const photos = validateFiles(incoming).slice(0, availableSlots);
    if (!availableSlots) throw new Error("Photo roll room sudah penuh");
    if (!photos.length) return;
    setUploadingRoom(true);
    try {
      for (const photo of photos) {
        const form = new FormData();
        form.append("photo", photo);
        await api.post(`/rooms/${roomId}/photos`, form);
      }
      await dispatch(fetchRoom(roomId));
      notify(`${photos.length} foto masuk ke room`);
    } finally {
      setUploadingRoom(false);
    }
  };

  const addPhotoFiles = async (incoming) => {
    if (roomId) {
      await uploadRoomPhotos(incoming);
      return;
    }
    const validFiles = validateFiles(incoming);
    setFiles((current) => [...current, ...validFiles].slice(0, settings.layout));
  };

  const handleFileInput = async (event) => {
    const incoming = Array.from(event.target.files || []);
    try {
      await addPhotoFiles(incoming);
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleCameraCapture = async (file) => {
    try {
      await addPhotoFiles([file]);
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
      throw error;
    }
  };

  const removeRoomPhoto = async (asset) => {
    try {
      await api.delete(`/rooms/${roomId}/photos/${asset.id}`);
      await dispatch(fetchRoom(roomId));
      notify("Foto dihapus. Kamu bisa mengambil ulang.");
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    }
  };

  const selectGenerationType = (option) => {
    dispatch(updateStudio({ generationType: option.id, mode: option.mode, style: option.style, templateId: option.id }));
  };

  const selectLayout = (layout) => {
    const templates = getPhotoTemplatesByLayout(layout);
    const compatibleCurrent = templates.some((template) => template.id === settings.frameTemplate);
    if (!roomId) setFiles((current) => current.slice(0, layout));
    dispatch(updateStudio({ layout, frameTemplate: compatibleCurrent ? settings.frameTemplate : templates[0]?.id || null }));
  };

  const handleGenerate = async () => {
    const availablePhotos = roomId ? roomAssets.length : files.length;
    if (!availablePhotos) return notify("Ambil atau unggah minimal satu foto", "error");
    if (availablePhotos < selectedGeneration.minPhotos) return notify(`Jenis ini membutuhkan minimal ${selectedGeneration.minPhotos} foto`, "error");
    dispatch({ type: "socket/connect" });
    const result = await dispatch(createGeneration({ files: roomId ? [] : files, settings, roomId }));
    if (createGeneration.fulfilled.match(result)) {
      dispatch(setBalance(result.payload.balance));
      notify("Generation dimulai. Pantau progres di galeri.");
      navigate("/creations");
    } else notify(result.payload, "error");
  };

  const handleExportStrip = async () => {
    if (!selectedFrame) return notify("Layout ini belum memiliki template export", "error");
    setExporting(true);
    try {
      await downloadPhotoStrip({ photos: stripPhotos, template: selectedFrame, filename: `afksnap-${selectedFrame.id}` });
      notify("Photo strip PNG berhasil dibuat");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setExporting(false);
    }
  };

  const capturedCount = roomId ? roomAssets.length : files.length;
  const cost = calculateGenerationCost(selectedGeneration, capturedCount);
  const maxShots = roomId ? 6 : settings.layout;

  return (
    <div>
      <div className="mb-7">
        <p className="text-sm font-black uppercase tracking-[.2em] text-orange-500">Photobooth Studio</p>
        <h1 className="mt-2 text-3xl font-black">Open camera, pose, lalu cetak.</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{roomId ? `Virtual room aktif${room ? ` — ${room.name}` : ""}. Setiap foto tersinkron otomatis ke teman.` : "Gunakan webcam laptop atau impor foto untuk sesi sendiri."}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-6">
          <Panel step="01" title="Pilih jenis sesi">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { dispatch(updateStudio({ mode: "studio", generationType: "solo-real", style: "photorealistic" })); if (roomId) navigate("/studio"); }} className={`rounded-2xl border p-4 text-left ${!roomId && settings.mode === "studio" ? "border-orange-500 bg-orange-500/10" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
                <Camera className="mb-3 text-orange-500" /><span className="block font-black">Studio sendiri</span><span className="mt-1 block text-xs text-[var(--muted)]">Foto tersimpan di browser sampai kamu generate atau export.</span>
              </button>
              <button type="button" onClick={() => dispatch(updateStudio({ mode: "group", generationType: "together-real", style: "photorealistic" }))} className={`rounded-2xl border p-4 text-left ${settings.mode === "group" ? "border-blue-500 bg-blue-500/10" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
                <Users className="mb-3 text-blue-500" /><span className="block font-black">Virtual bareng teman</span><span className="mt-1 block text-xs text-[var(--muted)]">Gunakan room dan Socket.IO agar photo roll semua peserta sinkron.</span>
              </button>
            </div>
            {settings.mode === "group" && !roomId && <div className="mt-4 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-[var(--text)]">Buat atau gabung room terlebih dahulu untuk sesi virtual. <Link to="/dashboard" className="font-black text-blue-500">Pilih room →</Link></div>}
            {roomId && <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-500/10 p-4 text-sm"><span className="font-bold text-blue-500">Socket room tersambung</span><span className="font-mono text-xs text-[var(--muted)]">{room?.code || "..."}</span></div>}
          </Panel>

          <Panel step="02" title="Buka kamera atau impor foto">
            <p className="mb-3 text-xs font-black uppercase tracking-[.18em] text-orange-500">Jumlah slot</p>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 6].map((count) => (
                <button key={count} type="button" onClick={() => selectLayout(count)} className={`rounded-2xl border p-3 transition ${settings.layout === count ? "border-orange-500 bg-orange-500/10" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
                  <span className={`mx-auto grid h-20 w-11 gap-1 rounded-md border-2 p-1 ${settings.layout === count ? "border-orange-500" : "border-[var(--muted)]"}`} style={{ gridTemplateRows: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))`, gridTemplateColumns: count === 6 ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
                    {Array.from({ length: count }).map((_, index) => <span key={index} className="rounded-sm bg-[var(--muted)]/40" />)}
                  </span>
                  <span className="mt-2 block text-xs font-black">{count} slot</span>
                </button>
              ))}
            </div>
            <CameraCapture onCapture={handleCameraCapture} overlayTemplate={selectedFrame} capturedCount={capturedCount} maxShots={maxShots} disabled={uploadingRoom} />
            <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--border)]" />atau impor foto<span className="h-px flex-1 bg-[var(--border)]" /></div>
            {roomId ? <RoomPhotoRoll roomAssets={roomAssets} user={user} room={room} uploading={uploadingRoom} onInput={handleFileInput} onRemove={removeRoomPhoto} /> : <PhotoUploader files={files} previews={previews} max={settings.layout} onChange={handleFileInput} onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} />}
          </Panel>

          <Panel step="03" title="Pilih template photo strip">
            {!compatibleTemplates.length && <p className="mb-4 rounded-xl bg-amber-500/10 p-3 text-xs font-semibold text-amber-600">Template tersedia untuk layout Single dan 2 slot. Layout {settings.layout} tetap dapat digunakan untuk generation AI tanpa frame.</p>}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {compatibleTemplates.map((template) => (
                <button key={template.id} type="button" onClick={() => dispatch(updateStudio({ frameTemplate: template.id, format: template.canvas?.height > template.canvas?.width ? "story" : "square" }))} className={`overflow-hidden rounded-xl border text-left transition ${settings.frameTemplate === template.id ? "border-orange-500 ring-2 ring-orange-500/20" : "border-[var(--border)]"}`}>
                  <img src={template.src} alt={template.name} className="aspect-[3/4] w-full bg-slate-950 object-contain" /><span className="block truncate bg-[var(--surface-2)] px-2 py-2 text-[10px] font-bold">{template.name}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel step="04" title="Pilih jenis hasil AI">
            <div className="grid gap-3 sm:grid-cols-2">
              {generationOptions.map((option) => {
                const optionCost = calculateGenerationCost(option, capturedCount);
                const unavailable = Boolean(roomId && option.mode === "studio");
                return (
                <button key={option.id} disabled={unavailable} onClick={() => selectGenerationType(option)} className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${settings.generationType === option.id ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
                  <span className="flex items-start justify-between gap-3"><span className="font-black text-[var(--text)]">{option.name}</span><span className="whitespace-nowrap rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-black text-orange-500">{optionCost} credit</span></span>
                  <span className="mt-2 block text-xs leading-relaxed text-[var(--muted)]">{option.description}</span>
                  {option.extraPersonCost > 0 && <span className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">+{option.extraPersonCost} credit/orang setelah 2 foto</span>}
                </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel step="05" title="Preview template">
            <PhotoStripPreview photos={stripPhotos} template={selectedFrame} />
            <p className="mt-4 text-center text-sm font-black">{selectedFrame?.name || `Layout ${settings.layout} slot`}</p>
            <button type="button" disabled={!stripPhotos.length || !selectedFrame || exporting} onClick={handleExportStrip} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-400/50 bg-orange-500/10 py-3.5 font-black text-orange-500 disabled:opacity-40">{exporting ? <LoaderCircle className="animate-spin" /> : <Download />} Export frame tanpa credit</button>
          </Panel>

          <Panel step="06" title="Atur hasil AI">
            {aiStatus && aiStatus.aiMode !== "openai" && <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-600"><b>AI asli belum aktif.</b> Server sedang dalam mode <code>{aiStatus.aiMode}</code>. Isi `OPENAI_API_KEY` dan gunakan `AI_MODE=auto` atau `AI_MODE=openai` pada `server/.env`, lalu restart server.</div>}
            {aiStatus?.aiMode === "openai" && <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600">OpenAI aktif — model {aiStatus.aiImageModel}</div>}
            <div className="mb-5">
              <span className="mb-2 block text-sm font-bold">Preset foto bersamaan</span>
              <div className="grid grid-cols-2 gap-2">
                {generationOptions.filter((option) => ["together-animation", "together-superhero", "together-80s", "together-simpsons"].includes(option.id)).map((option) => (
                  <button key={option.id} type="button" onClick={() => selectGenerationType(option)} className={`rounded-xl border p-3 text-left transition ${settings.generationType === option.id ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"}`}>
                    <span className="block text-sm font-black">{option.name}</span><span className="mt-1 block text-[10px] leading-relaxed text-[var(--muted)]">{option.shortDescription || option.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="mb-5 block"><span className="mb-2 block text-sm font-bold">Format output</span><div className="grid grid-cols-3 gap-2">{[{ value: "square", label: "1:1 Feed" }, { value: "card", label: "2:3 Card" }, { value: "story", label: "9:16 Story" }].map((item) => <button key={item.value} type="button" onClick={() => dispatch(updateStudio({ format: item.value }))} className={`rounded-xl border px-2 py-3 text-xs font-bold ${settings.format === item.value ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-[var(--border)] text-[var(--muted)]"}`}>{item.label}</button>)}</div></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Arahan tambahan</span><textarea rows="5" value={settings.prompt} onChange={(event) => dispatch(updateStudio({ prompt: event.target.value }))} placeholder="Contoh: berdiri bersebelahan, suasana ulang tahun..." className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm outline-none focus:border-orange-400" /></label>
          </Panel>

          <div className="rounded-3xl bg-gradient-to-br from-blue-950 to-slate-900 p-5 text-white">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-300"><Layers3 size={17} /> {selectedGeneration.name}</span><span className="flex items-center gap-2 text-xl font-black text-orange-400"><Coins size={20} /> {cost}</span></div>
            <button disabled={loading || capturedCount < selectedGeneration.minPhotos} onClick={handleGenerate} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 font-black transition hover:bg-orange-600 disabled:opacity-50"><WandSparkles /> {loading ? "Menyiapkan..." : `Generate — ${cost} credit`}</button>
            <p className="mt-3 text-center text-xs text-slate-400">Export strip biasa gratis. Credit hanya dipakai saat generate AI.</p>
          </div>
          <GenerationProgress job={active?.status !== "completed" ? active : null} />
        </div>
      </div>
    </div>
  );
}

function RoomPhotoRoll({ roomAssets, user, room, uploading, onInput, onRemove }) {
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm font-black text-[var(--text)] hover:border-orange-400">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onInput} disabled={uploading || roomAssets.length >= 6} />
        {uploading ? <LoaderCircle className="animate-spin text-orange-500" /> : <Camera className="text-orange-500" />} {uploading ? "Mengunggah ke room..." : "Impor ke photo roll room"}
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {roomAssets.map((asset) => {
          const canDelete = asset.userId === user?.id || room?.ownerId === user?.id || user?.role === "admin";
          return <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-2)]"><img src={assetUrl(asset.url)} alt={`Foto ${asset.user?.name || "peserta"}`} className="h-full w-full object-cover" /><span className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white">{asset.user?.name || "Peserta"}</span>{canDelete && <button type="button" onClick={() => onRemove(asset)} className="absolute right-2 top-2 grid size-9 place-items-center rounded-xl bg-slate-950/70 text-white transition sm:opacity-0 sm:group-hover:opacity-100" title="Hapus dan foto ulang"><Trash2 size={16} /></button>}</div>;
        })}
      </div>
      {!roomAssets.length && <p className="mt-3 text-center text-xs text-[var(--muted)]">Belum ada foto. Hasil kamera peserta akan tampil realtime di sini.</p>}
    </div>
  );
}

function Panel({ step, title, children }) {
  return <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-orange-500/10 text-xs font-black text-orange-500">{step}</span><h2 className="font-black">{title}</h2><Sparkles size={16} className="ml-auto text-orange-400" /></div>{children}</section>;
}
