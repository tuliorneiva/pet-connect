import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import type { SupportType } from "../../lib/types";
import { SUPPORT_TYPE_LABELS } from "../../lib/labels";
import { Button as ShadButton } from "@/components/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";

const TYPE_OPTIONS = Object.entries(SUPPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function AnimalPublicPage() {
  const { id } = useParams();
  const animalId = id ?? "";
  const { data, loading, error } = useAsync(() => publicApi.getAnimal(animalId), [animalId]);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Link to="/animais" className="text-sm text-muted-foreground hover:text-primary">← Voltar à vitrine</Link>
      {loading && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {error && <p className="mt-6 text-muted-foreground">Animal não encontrado.</p>}
      {data && (
        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {data.photo_url ? (
              <img className="aspect-square w-full object-cover" src={data.photo_url} alt={data.name} />
            ) : (
              <div className="grid aspect-square place-items-center text-7xl">🐾</div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {data.species}
              {data.breed ? ` · ${data.breed}` : ""}
              {data.sex ? ` · ${data.sex}` : ""}
              {data.size ? ` · porte ${data.size}` : ""}
              {data.birth_estimate ? ` · ${data.birth_estimate}` : ""}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Resgatado por <Link to={`/ongs/${data.org_slug}`} className="font-semibold text-primary">{data.org_name}</Link>
              {data.org_city ? ` · ${data.org_city}` : ""}
            </p>
            {data.description && <p className="mt-6 leading-relaxed">{data.description}</p>}
            <div className="mt-8">
              <ShadButton onClick={() => setOpen(true)}>Tenho interesse</ShadButton>
            </div>
          </div>
        </div>
      )}
      {data && (
        <InterestModal open={open} onClose={() => setOpen(false)} animalId={animalId} animalName={data.name} />
      )}
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
        <DialogHeader><DialogTitle>Interesse em {animalName}</DialogTitle></DialogHeader>
        {done ? (
          <>
            <div className="px-6 py-6 text-sm">
              Solicitação enviada. O abrigo entra em contato pelo e-mail informado.
            </div>
            <DialogFooter data-testid="interest-footer">
              <Button onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="flex flex-col gap-4 px-6 py-5">
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
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
