import { useState } from "react";
import { publicApi } from "../../lib/publicApi";
import type { VitrineFilters } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { SEX_OPTIONS, SIZE_OPTIONS, SPECIES_OPTIONS } from "../../lib/labels";
import { AnimalCard } from "../../components/AnimalCard";
import { Select } from "@/components/shadcn/select";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Skeleton } from "@/components/shadcn/skeleton";

export function HomePage() {
  const [filters, setFilters] = useState<VitrineFilters>({});
  const { data, loading, error } = useAsync(
    () => publicApi.listAnimals(filters),
    [filters.species, filters.size, filters.sex, filters.city],
  );

  function set(key: keyof VitrineFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground"><a href="/" className="hover:text-primary">Início</a> › Animais para adoção</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Adote um amigo</h1>
        <p className="mt-3 max-w-prose text-lg text-muted-foreground">
          Conheça os animais que estão à espera de um novo lar. Use os filtros para encontrar quem combina com você.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3.5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Espécie</Label>
          <Select value={filters.species ?? ""} onChange={(e) => set("species", e.target.value)}>
            <option value="">Todas</option>
            {SPECIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Porte</Label>
          <Select value={filters.size ?? ""} onChange={(e) => set("size", e.target.value)}>
            <option value="">Todos</option>
            {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Sexo</Label>
          <Select value={filters.sex ?? ""} onChange={(e) => set("sex", e.target.value)}>
            <option value="">Todos</option>
            {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Cidade</Label>
          <Input value={filters.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Qualquer cidade" />
        </div>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <Skeleton className="aspect-square rounded-none" />
                <div className="space-y-2 p-4"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32" /></div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="rounded-md border border-border bg-card p-6 text-muted-foreground">{error}</p>}
        {data && data.length === 0 && (
          <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum animal disponível com esses filtros no momento.
          </div>
        )}
        {data && data.length > 0 && (
          <>
            <p className="mb-5 font-semibold"><span className="text-primary">{data.length}</span> {data.length === 1 ? "animal disponível" : "animais disponíveis"}</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.map((a) => <AnimalCard key={a.id} animal={a} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
