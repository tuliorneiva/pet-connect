import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalendarDays, Check, Copy, Globe, Home, Mail, MapPin, PawPrint, Phone, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { AnimalCard } from "../../components/AnimalCard";
import { SocialLinks } from "@/components/public/SocialLinks";
import { Card } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";

function ContactRow({ icon: Icon, label, value }: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-accent">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="text-sm">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

function PixRow({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de clipboard — sem fallback melhor que deixar selecionar o texto.
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-accent">
        <QrCode className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="text-xs text-muted-foreground">Chave Pix</div>
        <div className="truncate font-semibold">{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar chave Pix"
        title="Copiar chave Pix"
        className="grid h-8 w-8 flex-none place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
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
      <div className="-mx-6 -mt-10 bg-gradient-to-br from-primary to-[#155E75] px-6 pb-7 pt-10">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="grid h-24 w-24 flex-none place-items-center rounded-3xl border-4 border-white/25 bg-white/10 shadow-md sm:h-28 sm:w-28">
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              <Home className="h-11 w-11 text-white" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{org.name}</h1>
              {org.verified && (
                <Badge className="gap-1 border-white/30 bg-white/15 text-white">
                  <Check className="h-3 w-3" aria-hidden="true" /> ONG verificada
                </Badge>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4 text-sm text-cyan-50">
              {org.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {org.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Parceira desde {since}
              </span>
              <span className="flex items-center gap-1">
                <PawPrint className="h-3.5 w-3.5" aria-hidden="true" /> {org.available_count} para adoção
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {org.description && (
            <Card className="mb-8 p-6">
              <h2 className="mb-3 text-xl font-bold">Sobre a ONG</h2>
              <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{org.description}</p>
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
            <ContactRow icon={Phone} label="Telefone" value={org.phone} />
            <ContactRow icon={Mail} label="E-mail" value={org.email} />
            <ContactRow icon={Globe} label="Site" value={org.website} />
            <ContactRow icon={MapPin} label="Endereço" value={org.address} />
            <PixRow value={org.pix_key} />
            <SocialLinks
              whatsapp={org.whatsapp}
              instagram={org.instagram}
              facebook={org.facebook}
              orgName={org.name}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
