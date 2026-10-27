import { Camera, CameraOff, Check, LoaderCircle, Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LiveVideo from "./LiveVideo";

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

export default function CameraCapture({ onCapture, onCameraStateChange, overlayTemplate, capturedCount = 0, maxShots = 6, disabled = false, slotIndex = null, slotLabel = "", onStreamChange, peers = [], onShutter, syncCapture = null, onSyncResult, delayOptions = [0, 3, 5] }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const cameraStateCallbackRef = useRef(onCameraStateChange);
  const streamCallbackRef = useRef(onStreamChange);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [delay, setDelay] = useState(3);
  const [mirror, setMirror] = useState(true);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState("");
  const ownSlotIndex = overlayTemplate?.slots?.length ? (slotIndex ?? capturedCount) % overlayTemplate.slots.length : null;
  const liveSlot = ownSlotIndex === null ? null : overlayTemplate.slots[ownSlotIndex];
  const slotLayer = overlayTemplate?.photoLayer === "above" ? "z-10" : "z-0";
  // Kamera peserta lain tampil di slot template masing-masing; yang tidak kebagian slot tampil sebagai thumbnail.
  const slottedPeers = overlayTemplate ? peers.filter((peer) => peer.slotIndex !== null && peer.slotIndex !== undefined && peer.slotIndex !== ownSlotIndex) : [];
  const floatingPeers = peers.filter((peer) => !slottedPeers.includes(peer));

  useEffect(() => {
    cameraStateCallbackRef.current = onCameraStateChange;
    streamCallbackRef.current = onStreamChange;
  }, [onCameraStateChange, onStreamChange]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOpen(false);
    setCountdown(null);
    streamCallbackRef.current?.(null);
    cameraStateCallbackRef.current?.(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (streamRef.current) {
      streamCallbackRef.current?.(null);
      cameraStateCallbackRef.current?.(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [open]);

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Kamera membutuhkan localhost atau website HTTPS dan browser yang mendukung webcam.");
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setOpen(true);
      streamCallbackRef.current?.(stream);
      cameraStateCallbackRef.current?.(true);
    } catch (cameraError) {
      if (cameraError.name === "NotAllowedError") setError("Izin kamera ditolak. Izinkan Camera pada pengaturan browser lalu coba lagi.");
      else if (cameraError.name === "NotFoundError") setError("Kamera laptop tidak ditemukan.");
      else setError("Kamera tidak dapat dibuka. Pastikan tidak sedang digunakan aplikasi lain.");
    } finally {
      setStarting(false);
    }
  };

  const createPhotoFile = () => new Promise((resolve, reject) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.videoWidth || !canvas) return reject(new Error("Preview kamera belum siap"));
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (mirror) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Foto gagal dibuat"));
      resolve(new File([blob], `afksnap-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });

  const takePhoto = async () => {
    if (capturing || disabled || capturedCount >= maxShots) return;
    // onShutter (admin room) dapat mengambil alih tombol untuk memulai foto bersama di semua kamera.
    if (onShutter && await onShutter(delay)) return;
    setCapturing(true);
    setError("");
    try {
      for (let number = delay; number > 0; number -= 1) {
        setCountdown(number);
        await wait(1000);
      }
      setCountdown(null);
      setFlash(true);
      const file = await createPhotoFile();
      await onCapture(file);
      await wait(140);
      setFlash(false);
    } catch (captureError) {
      setError(captureError.message || "Foto gagal diambil");
      setFlash(false);
    } finally {
      setCapturing(false);
    }
  };

  // Foto bersama: semua browser menghitung mundur ke captureAt yang sama dari server lalu memotret serentak.
  const syncHandlersRef = useRef({});
  syncHandlersRef.current = { createPhotoFile, onCapture, onSyncResult };
  const syncCaptureRef = useRef(syncCapture);
  syncCaptureRef.current = syncCapture;
  const syncSessionId = syncCapture?.sessionId;
  useEffect(() => {
    const session = syncCaptureRef.current;
    if (!syncSessionId || !session) return;
    const report = (result) => syncHandlersRef.current.onSyncResult?.(session.sessionId, result);
    (async () => {
      setCapturing(true);
      setError("");
      try {
        for (;;) {
          const remaining = session.localCaptureAt - Date.now();
          if (remaining <= 0) break;
          setCountdown(Math.ceil(remaining / 1000));
          await wait(Math.min(200, remaining));
        }
        setCountdown(null);
        if (!session.localEligible) return;
        if (!streamRef.current) throw new Error("Kamera tidak aktif saat foto bersama");
        setFlash(true);
        const file = await syncHandlersRef.current.createPhotoFile();
        const asset = await syncHandlersRef.current.onCapture(file);
        report({ status: "completed", assetId: asset?.id });
        await wait(140);
        setFlash(false);
      } catch (captureError) {
        setFlash(false);
        setError(captureError.message || "Foto bersama gagal diambil");
        if (session.localEligible) report({ status: "failed", message: captureError.message });
      } finally {
        setCountdown(null);
        setCapturing(false);
      }
    })();
  }, [syncSessionId]);

  const countdownOverlay = countdown !== null && (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/25 text-8xl font-black text-white drop-shadow-2xl">{countdown || <Check />}</div>
  );
  const frameClassName = `relative overflow-hidden ${overlayTemplate ? "mx-auto max-h-[72vh] bg-slate-900" : "aspect-video"}`;
  const frameStyle = overlayTemplate ? { aspectRatio: `${overlayTemplate.canvas?.width || 1080}/${overlayTemplate.canvas?.height || 1920}` } : undefined;
  const templateImage = overlayTemplate && <img src={overlayTemplate.src} alt={`Preview ${overlayTemplate.name}`} className={`pointer-events-none absolute inset-0 h-full w-full object-fill ${overlayTemplate.photoLayer === "above" ? "z-0" : "z-10"}`} />;
  const peerVideos = (
    <>
      {slottedPeers.map((peer) => {
        const slot = overlayTemplate.slots[peer.slotIndex];
        return (
          <div key={peer.key} className={`absolute overflow-hidden bg-slate-800 ${slotLayer}`} style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }}>
            {peer.stream ? <LiveVideo stream={peer.stream} className="h-full w-full" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-slate-400">Menyambungkan...</div>}
            <span className="absolute bottom-1.5 left-1.5 max-w-[85%] truncate rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-white">{peer.name}</span>
          </div>
        );
      })}
      {!!floatingPeers.length && (
        <div className="absolute bottom-16 right-3 z-30 flex max-w-[60%] flex-wrap justify-end gap-2">
          {floatingPeers.map((peer) => (
            <div key={peer.key} className="relative aspect-video w-24 overflow-hidden rounded-lg border border-white/30 bg-slate-800 sm:w-28">
              {peer.stream ? <LiveVideo stream={peer.stream} className="h-full w-full" /> : <div className="grid h-full place-items-center text-[9px] font-bold text-slate-400">Menyambungkan...</div>}
              <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-bold text-white">{peer.name}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (!open) {
    return (
      <div className="space-y-3">
        {!!peers.length && (
          <div className="overflow-hidden rounded-3xl border border-orange-400/50 bg-slate-950">
            <div className={frameClassName} style={frameStyle}>{templateImage}{peerVideos}{countdownOverlay}</div>
          </div>
        )}
        <button
          type="button"
          onClick={startCamera}
          disabled={starting || disabled || capturedCount >= maxShots}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-400/50 bg-orange-500/10 px-4 py-4 font-black text-orange-500 transition hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting ? <LoaderCircle className="animate-spin" /> : <Camera />}
          {starting ? "Membuka kamera..." : capturedCount >= maxShots ? "Slot foto sudah penuh" : "Open Camera Laptop"}
        </button>
        {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-orange-400/50 bg-slate-950">
      <div className={frameClassName} style={frameStyle}>
        {templateImage}
        <video ref={videoRef} autoPlay muted playsInline style={liveSlot ? { left: `${liveSlot.x}%`, top: `${liveSlot.y}%`, width: `${liveSlot.width}%`, height: `${liveSlot.height}%` } : undefined} className={`${liveSlot ? `absolute object-cover ${slotLayer}` : "h-full w-full object-cover"} ${mirror ? "-scale-x-100" : ""}`} />
        {peerVideos}
        {!overlayTemplate && <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/40" />}
        <div className="absolute left-4 top-4 z-30 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-black text-white">
          {capturedCount}/{maxShots} tersimpan
        </div>
        {slotLabel && <div className="absolute bottom-4 left-4 z-30 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-black text-white">Slot kamu: {slotLabel}</div>}
        <button type="button" onClick={stopCamera} className="absolute right-4 top-4 z-30 grid size-10 place-items-center rounded-full bg-slate-950/70 text-white" aria-label="Tutup kamera"><X size={18} /></button>
        {countdownOverlay}
        {flash && <div className="absolute inset-0 z-40 bg-white" />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-white">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"><Timer size={15} /><select value={delay} onChange={(event) => setDelay(Number(event.target.value))} className="bg-transparent outline-none">{delayOptions.map((option) => <option key={option} className="text-slate-950" value={option}>{option ? `${option} detik` : "Tanpa timer"}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={mirror} onChange={(event) => setMirror(event.target.checked)} className="accent-orange-500" /> Mirror</label>
        </div>
        <button type="button" onClick={takePhoto} disabled={capturing || disabled || capturedCount >= maxShots} className="grid size-16 place-items-center rounded-full border-4 border-white bg-orange-500 shadow-lg shadow-orange-500/30 disabled:opacity-50" aria-label="Ambil foto">
          {capturing ? <LoaderCircle className="animate-spin" /> : capturedCount >= maxShots ? <CameraOff /> : <Camera />}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="px-4 pb-4 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}
