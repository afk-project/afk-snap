import { Camera, CameraOff, Check, LoaderCircle, Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

export default function CameraCapture({ onCapture, onCameraStateChange, overlayTemplate, capturedCount = 0, maxShots = 6, disabled = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const cameraStateCallbackRef = useRef(onCameraStateChange);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [delay, setDelay] = useState(3);
  const [mirror, setMirror] = useState(true);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState("");
  const liveSlot = overlayTemplate?.slots?.[capturedCount % overlayTemplate.slots.length];

  useEffect(() => {
    cameraStateCallbackRef.current = onCameraStateChange;
  }, [onCameraStateChange]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOpen(false);
    setCountdown(null);
    cameraStateCallbackRef.current?.(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (streamRef.current) cameraStateCallbackRef.current?.(false);
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

  if (!open) {
    return (
      <div>
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
      <div className={`relative overflow-hidden ${overlayTemplate ? "mx-auto max-h-[72vh] bg-slate-900" : "aspect-video"}`} style={overlayTemplate ? { aspectRatio: `${overlayTemplate.canvas?.width || 1080}/${overlayTemplate.canvas?.height || 1920}` } : undefined}>
        {overlayTemplate && <img src={overlayTemplate.src} alt={`Preview ${overlayTemplate.name}`} className={`pointer-events-none absolute inset-0 h-full w-full object-fill ${overlayTemplate.photoLayer === "above" ? "z-0" : "z-10"}`} />}
        <video ref={videoRef} autoPlay muted playsInline style={liveSlot ? { left: `${liveSlot.x}%`, top: `${liveSlot.y}%`, width: `${liveSlot.width}%`, height: `${liveSlot.height}%` } : undefined} className={`${liveSlot ? `absolute object-cover ${overlayTemplate?.photoLayer === "above" ? "z-10" : "z-0"}` : "h-full w-full object-cover"} ${mirror ? "-scale-x-100" : ""}`} />
        {!overlayTemplate && <div className="pointer-events-none absolute inset-4 rounded-2xl border border-white/40" />}
        <div className="absolute left-4 top-4 z-30 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-black text-white">
          {capturedCount}/{maxShots} tersimpan
        </div>
        <button type="button" onClick={stopCamera} className="absolute right-4 top-4 z-30 grid size-10 place-items-center rounded-full bg-slate-950/70 text-white" aria-label="Tutup kamera"><X size={18} /></button>
        {countdown !== null && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/25 text-8xl font-black text-white drop-shadow-2xl">{countdown || <Check />}</div>}
        {flash && <div className="absolute inset-0 z-40 bg-white" />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-white">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"><Timer size={15} /><select value={delay} onChange={(event) => setDelay(Number(event.target.value))} className="bg-transparent outline-none"><option className="text-slate-950" value="0">Tanpa timer</option><option className="text-slate-950" value="3">3 detik</option><option className="text-slate-950" value="5">5 detik</option></select></label>
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
