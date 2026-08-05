import { Link } from "react-router-dom";
import { publicApi } from "@/lib/publicApi";
import { useAsync } from "@/lib/useAsync";
import { AnimalCard } from "@/components/AnimalCard";

export function RelatedAnimals({ orgSlug, orgName, excludeId }: {
  orgSlug: string; orgName: string; excludeId: string;
}) {
  const { data } = useAsync(() => publicApi.listAnimals({ org: orgSlug }), [orgSlug]);
  const others = (data ?? []).filter((a) => a.id !== excludeId).slice(0, 4);
  if (others.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Outros animais do {orgName}</h2>
        <Link to={`/ongs/${orgSlug}`} className="text-sm text-primary">Ver todos</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((a) => <AnimalCard key={a.id} animal={a} />)}
      </div>
    </section>
  );
}
