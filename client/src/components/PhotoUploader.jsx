import { Camera, ImagePlus, Trash2 } from "lucide-react";

export default function PhotoUploader({ files, previews, onChange, onRemove, max = 6, allowEmpty = false }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {previews.map((preview, index) => (
          <div key={preview} className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
            <img src={preview} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-2 top-2 grid size-9 place-items-center rounded-xl bg-red-500 text-white shadow-lg transition hover:bg-red-600"
              aria-label="Hapus foto"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        {files.length < max && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] text-center transition hover:border-orange-400 hover:bg-orange-500/5">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onChange} />
            <span className="px-4 text-[var(--muted)]">
              <ImagePlus className="mx-auto mb-2 text-orange-500" />
              <span className="block text-sm font-bold text-[var(--text)]">Tambah foto</span>
              <span className="text-xs">JPG, PNG, WebP • maks. 8 MB</span>
            </span>
          </label>
        )}
      </div>
      {!files.length && !allowEmpty && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]"><Camera size={14} /> Unggah minimal satu foto wajah yang jelas.</p>
      )}
    </div>
  );
}
