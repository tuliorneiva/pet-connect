import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import type { SupportType } from "../../lib/types";
import { SUPPORT_TYPE_LABELS } from "../../lib/labels";
import { Button } from "@/components/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { AnimalGallery } from "@/components/public/AnimalGallery";
import { HealthBadges } from "@/components/public/HealthBadges";
import { RelatedAnimals } from "@/components/public/RelatedAnimals";

const TYPE_OPTIONS = Object.entries(SUPPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function AnimalPublicPage() {
  const { id } = useParams();
  const animalId = id ?? "";
  const { data, loading, error } = useAsync(() => publicApi.getAnimal(animalId), [animalId]);
  const [open, setOpen] = useState(false);

  if (loading) return <p className="py-16 text-center text-muted-foreground">Carregando…</p>;
  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Este animal não está mais disponível.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/animais">Ver a vitrine</Link>
        </Button>
      </div>
    );
  }

  const traits = [data.species, data.breed, data.sex, data.size && `porte ${data.size}`, data.birth_estimate]
    .filter(Boolean) as string[];

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        <Link to="/animais" className="hover:text-primary">Animais</Link> › {data.name}
      </p>

      <div className="grid items-start gap-7 md:grid-cols-[1.15fr_.85fr]">
        <AnimalGallery photos={data.photo_url ? [data.photo_url] : []} name={data.name} />

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:sticky md:top-24">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {traits.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <HealthBadges upToDate={data.vaccines_up_to_date} underTreatment={data.under_treatment} />

          <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-gradient-to-br from-primary to-[#14b8a6] text-white">
              🏠
            </span>
            <span className="text-sm">
              <Link to={`/ongs/${data.org_slug}`} className="font-semibold">{data.org_name}</Link>
              {data.org_city && <span className="block text-xs text-muted-foreground">{data.org_city}</span>}
            </span>
          </div>

          <div className="h-px bg-border" />

          <Button size="lg" className="w-full" onClick={() => setOpen(true)}>Tenho interesse</Button>
          <p className="text-center text-xs text-muted-foreground">
            Sem compromisso — o abrigo entra em contato
          </p>
        </div>
      </div>

      {data.description && (
        <div className="mt-7 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-base font-semibold">Sobre {data.name}</h2>
          <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{data.description}</p>
        </div>
      )}

      <RelatedAnimals orgSlug={data.org_slug} orgName={data.org_name} excludeId={data.id} />

      <InterestModal open={open} onClose={() => setOpen(false)} animalId={animalId} animalName={data.name} />
    </div>
  );
}

export function InterestModal({ open, onClose, animalId, animalName }: {
  open: boolean; onClose: () => void; animalId: string; animalName: string;
}) {
  const [type, setType] = useState<SupportType>("adoção");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await publicApi.createSupportRequest({
        animal_id: animalId,
        type,
        requester_name: name,
        requester_email: email,
        requester_phone: phone || undefined,
        message: message || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Interesse em {animalName}</DialogTitle>
          <DialogDescription>
            {done ? "Sua solicitação foi registrada." : "Envie seus dados e a ONG entra em contato."}
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <>
            <div className="px-6 py-6 text-sm">
              Solicitação enviada. A ONG entra em contato pelo e-mail informado.
            </div>
            <DialogFooter data-testid="interest-footer">
              <Button onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="flex flex-col gap-4 px-6 py-5">
              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipo">Tipo de apoio</Label>
                <Select value={type} onValueChange={(v) => setType(v as SupportType)}>
                  <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Seu nome</Label>
                <Input id="nome" value={name} onChange={(e) => setName(e.target.value)} required
                       placeholder="Como podemos te chamar" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       required placeholder="voce@email.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tel">Telefone</Label>
                <Input id="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                       placeholder="(83) 90000-0000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="msg">Mensagem</Label>
                <Input id="msg" value={message} onChange={(e) => setMessage(e.target.value)}
                       placeholder="Conte um pouco sobre você e sua casa" />
              </div>
            </div>
            <DialogFooter data-testid="interest-footer">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar solicitação"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
