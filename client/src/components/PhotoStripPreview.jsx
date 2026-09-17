export default function PhotoStripPreview({ photos, template }) {
  if (!template) return <div className="grid aspect-[9/16] w-full place-items-center rounded-2xl bg-[var(--surface-2)] px-6 text-center text-sm font-bold text-[var(--muted)]">Pilih jumlah frame dan template photobooth terlebih dahulu.</div>;
  const photosAboveFrame = template.photoLayer === "above";
  return (
    <div className="relative mx-auto w-full max-w-[310px] overflow-hidden rounded-2xl bg-slate-950 shadow-2xl" style={{ aspectRatio: `${template.canvas?.width || 1080}/${template.canvas?.height || 1920}` }}>
      <img src={template.src} alt={template.name} className={`pointer-events-none absolute inset-0 h-full w-full ${photosAboveFrame ? "z-0" : "z-20"}`} />
      {template.slots.map((slot, index) => (
        <div
          key={`${template.id}-${index}`}
          className={`absolute overflow-hidden bg-slate-800 ${photosAboveFrame ? "z-10" : "z-0"}`}
          style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }}
        >
          {photos.length ? (
            <img src={photos[index % photos.length]} alt={`Slot ${index + 1}`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center px-3 text-center text-xs font-bold text-slate-500">Foto {index + 1}</div>
          )}
        </div>
      ))}
    </div>
  );
}
