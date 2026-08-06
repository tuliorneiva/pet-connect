import { useState } from "react";
import { cn } from "@/lib/utils";

export function AnimalGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div
        data-testid="gallery-empty"
        aria-label="Sem foto disponível"
        className="grid aspect-[4/3] place-items-center rounded-xl border border-border bg-card text-6xl"
      >
        <span aria-hidden="true">🐾</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <img
        data-testid="gallery-main"
        src={photos[active]}
        alt={`Foto de ${name}`}
        className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
      />
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-2.5">
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ver foto ${i + 1} de ${name}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "aspect-square overflow-hidden rounded-md border",
                i === active ? "border-2 border-primary" : "border-border",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
