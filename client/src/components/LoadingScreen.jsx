import { Aperture } from "lucide-react";

export default function LoadingScreen({ label = "Menyiapkan AFKSnap..." }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-[var(--text)]">
      <div className="text-center">
        <Aperture className="mx-auto mb-4 animate-spin text-orange-500" size={42} />
        <p className="text-sm text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}
