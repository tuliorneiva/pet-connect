import { useParams, Link } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { AnimalCard } from "../../components/AnimalCard";
import { Card } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";

function ContactRow({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-accent text-base">{icon}</span>
      <div className="text-sm">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

export function OrgPage() {
  const { slug = "" } = useParams();
  const { data: org, loading, error } = useAsync(() => publicApi.getOrganization(slug), [slug]);
  const { data: animals } = useAsync(() => publicApi.listAnimals({ org: slug }), [slug]);

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;
  if (error || !org) return <p className="text-muted-foreground">ONG não encontrada.</p>;

  const since = new Date(org.created_at).getFullYear();

  return (
    <div>
      <div className="-mx-6 -mt-10 h-40 bg-gradient-to-br from-primary to-[#155E75]" />
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end" style={{ marginTop: -56 }}>
        <div className="grid h-28 w-28 flex-none place-items-center rounded-3xl border-4 border-card bg-gradient-to-br from-[#22D3EE] to-primary text-5xl shadow-md">
          {org.logo_url ? <img src={org.logo_url} alt="" className="h-full w-full rounded-3xl object-cover" /> : "🏠"}
        </div>
        <div className="flex-1 pb-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{org.name}</h1>
            {org.verified && <Badge>✓ ONG verificada</Badge>}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {org.city && <span>📍 {org.city}</span>}
            <span>🗓️ Parceira desde {since}</span>
            <span>🐾 {org.available_count} para adoção</span>
          </div>
        </div>
      </div>

      <div className="mt-11 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {org.description && (
            <Card className="mb-8 p-6">
              <h2 className="mb-3 text-xl font-bold">Sobre a ONG</h2>
              <p className="leading-relaxed text-slate-700">{org.description}</p>
            </Card>
          )}

          <div className="mb-8 grid grid-cols-3 gap-4">
            <Card className="p-5 text-center"><div className="text-2xl font-bold text-primary">{org.available_count}</div><div className="text-sm text-muted-foreground">disponíveis</div></Card>
            <Card className="p-5 text-center"><div className="text-2xl font-bold text-primary">{org.adopted_count}</div><div className="text-sm text-muted-foreground">adoções</div></Card>
            {org.founded_year && (
              <Card className="p-5 text-center"><div className="text-2xl font-bold text-primary">{org.founded_year}</div><div className="text-sm text-muted-foreground">fundação</div></Card>
            )}
          </div>

          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Animais para adoção</h2>
            <span className="text-sm text-muted-foreground">{animals?.length ?? 0} animais</span>
          </div>
          {animals && animals.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
              Nenhum animal disponível no momento.
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-[88px] lg:self-start">
          <Card className="border-0 bg-gradient-to-br from-primary to-[#155E75] p-6 text-white">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#cffafe]">Quer ajudar?</h3>
            <p className="mt-3 text-sm text-cyan-50">Adote, doe ou seja voluntário. Todo apoio faz diferença.</p>
            <Button asChild variant="secondary" className="mt-4 w-full"><Link to="/animais">Ver animais</Link></Button>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</h3>
            <ContactRow icon="📞" label="Telefone" value={org.phone} />
            <ContactRow icon="✉️" label="E-mail" value={org.email} />
            <ContactRow icon="🌐" label="Site" value={org.website} />
            <ContactRow icon="📍" label="Endereço" value={org.address} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
