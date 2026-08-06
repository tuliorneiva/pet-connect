import { Link } from "react-router-dom";
import type { PublicAnimal } from "../lib/types";
import { Badge } from "@/components/shadcn/badge";
import { sexLabel, sizeLabel, speciesLabel } from "@/lib/labels";

export function AnimalCard({ animal }: { animal: PublicAnimal }) {
  return (
    <Link
      to={`/animais/${animal.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative aspect-square bg-slate-100">
        {animal.photo_url ? (
          <img src={animal.photo_url} alt={animal.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-6xl">🐾</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-lg font-bold">{animal.name}</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge>{speciesLabel(animal.species)}</Badge>
          {animal.sex && <Badge variant="secondary">{sexLabel(animal.sex)}</Badge>}
          {animal.size && <Badge variant="secondary">{sizeLabel(animal.size)}</Badge>}
        </div>
        <div className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
          📍 {animal.org_city ? `${animal.org_city} · ` : ""}{animal.org_name}
        </div>
      </div>
    </Link>
  );
}
