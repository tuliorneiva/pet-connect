import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../lib/adminApi";
import type { AnimalInput, AnimalPhoto } from "../../lib/types";
import {
  ANIMAL_STATUS_OPTIONS,
  SEX_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
} from "../../lib/labels";
import { Card, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Textarea } from "@/components/shadcn/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { PhotoUploader } from "@/components/admin/PhotoUploader";

// Radix Select não aceita value=""; Sexo e Porte são opcionais, então usamos
// esta sentinela para representar "nenhum" e convertemos para null na borda
// (mesmo padrão dos filtros da vitrine em HomePage.tsx).
const NONE = "—";

const EMPTY: AnimalInput = {
  name: "",
  species: "cão",
  breed: "",
  sex: null,
  size: null,
  birth_estimate: "",
  description: "",
  status: "disponível",
};

/** Converte a sentinela de "sem valor" para null antes de enviar à API. */
function toPayload(f: AnimalInput): AnimalInput {
  return {
    ...f,
    sex: f.sex === NONE ? null : f.sex,
    size: f.size === NONE ? null : f.size,
  };
}

export function AnimalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<AnimalInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fotos já salvas no animal (com id, para remover/trocar capa), as retidas
  // até existir um animal para anexá-las e as que falharam ao subir.
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [failed, setFailed] = useState<File[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Redimensionar e subir uma foto leva alguns segundos; travamos o Salvar nesse
  // intervalo para não deixar salvar o animal sem a foto que já parece anexada.
  const [photoBusy, setPhotoBusy] = useState(false);

  // Depois de criar o animal na hora do Salvar, o formulário passa a editá-lo:
  // não há mais volta para o modo "novo" nesta sessão.
  const animalId = id ?? createdId;
  const editing = Boolean(animalId);

  useEffect(() => {
    if (id) {
      adminApi.getAnimal(id).then((a) => {
        setForm({
          name: a.name,
          species: a.species,
          breed: a.breed ?? "",
          sex: a.sex ?? null,
          size: a.size ?? null,
          birth_estimate: a.birth_estimate ?? "",
          description: a.description ?? "",
          status: a.status,
        });
        setPhotos(a.photo_items);
      });
    }
  }, [id]);

  function set<K extends keyof AnimalInput>(key: K, value: AnimalInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Sobe os arquivos retidos. Devolve os que falharam — o animal já existe e fica. */
  async function uploadPending(targetId: string, files: File[]): Promise<File[]> {
    const naoSubiram: File[] = [];
    for (const file of files) {
      try {
        await adminApi.uploadPhoto(targetId, file);
      } catch {
        naoSubiram.push(file);
      }
    }
    return naoSubiram;
  }

  async function reloadPhotos(targetId: string) {
    const atual = await adminApi.getAnimal(targetId);
    setPhotos(atual.photo_items);
  }

  async function handleRemovePhoto(photoId: string) {
    if (!animalId) return;
    setError(null);
    try {
      await adminApi.deletePhoto(animalId, photoId);
      await reloadPhotos(animalId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover foto");
    }
  }

  async function handleSetCover(photoId: string) {
    if (!animalId) return;
    setError(null);
    try {
      setPhotos(await adminApi.setCoverPhoto(animalId, photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao definir capa");
    }
  }

  function handleRemovePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSetPendingCover(index: number) {
    setPending((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      copy.unshift(chosen);
      return copy;
    });
  }

  /** Sem animal ainda, os arquivos ficam retidos; com animal, sobem na hora. */
  async function handlePick(files: File[]) {
    if (!animalId) {
      setPending((prev) => [...prev, ...files]);
      return;
    }
    setError(null);
    try {
      for (const file of files) {
        await adminApi.uploadPhoto(animalId, file);
      }
    } catch (err) {
      // O PhotoUploader já valida tipo e quantidade; isto é o erro que só a API
      // enxerga (ex.: tamanho do arquivo), então a mensagem do servidor precisa aparecer.
      setError(err instanceof Error ? err.message : "Erro ao subir foto");
    } finally {
      await reloadPhotos(animalId);
    }
  }

  async function retryFailed() {
    if (!animalId) return;
    const aindaFalham = await uploadPending(animalId, failed);
    setFailed(aindaFalham);
    if (aindaFalham.length === 0) await reloadPhotos(animalId);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = toPayload(form);
      if (animalId) {
        await adminApi.updateAnimal(animalId, payload);
        navigate("/admin/animais");
      } else {
        const criado = await adminApi.createAnimal(payload);
        const naoSubiram = pending.length ? await uploadPending(criado.id, pending) : [];
        if (naoSubiram.length) {
          // Desfazer o animal por causa de uma foto seria pior: o cadastro fica,
          // o alerta diz o que faltou e o botão tenta de novo.
          setCreatedId(criado.id);
          setPending([]);
          setFailed(naoSubiram);
          return;
        }
        navigate("/admin/animais");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div data-testid="form-header" className="mb-5 flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          {editing ? `Editar ${form.name || "animal"}` : "Novo animal"}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/animais")}>
            Cancelar
          </Button>
          <Button type="submit" form="animal-form" disabled={submitting || photoBusy}>
            {submitting ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {failed.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <span>
            O animal foi salvo, mas {failed.length === 1 ? "1 foto não subiu" : `${failed.length} fotos não subiram`}.
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={retryFailed}>
            Tentar novamente
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form id="animal-form" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="especie">Espécie</Label>
                <Select value={form.species} onValueChange={(v) => set("species", v)}>
                  <SelectTrigger id="especie"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="raca">Raça</Label>
                <Input id="raca" value={form.breed ?? ""} onChange={(e) => set("breed", e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={form.sex ?? NONE} onValueChange={(v) => set("sex", v === NONE ? null : v)}>
                  <SelectTrigger id="sexo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {SEX_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="porte">Porte</Label>
                <Select value={form.size ?? NONE} onValueChange={(v) => set("size", v === NONE ? null : v)}>
                  <SelectTrigger id="porte"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {SIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="idade">Idade estimada</Label>
                <Input
                  id="idade"
                  value={form.birth_estimate ?? ""}
                  onChange={(e) => set("birth_estimate", e.target.value)}
                  placeholder="ex.: 2 anos"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="situacao">Situação</Label>
                <Select value={form.status ?? "disponível"} onValueChange={(v) => set("status", v as AnimalInput["status"])}>
                  <SelectTrigger id="situacao"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIMAL_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Fotos</Label>
                <PhotoUploader
                  photos={photos}
                  pending={pending}
                  onPick={handlePick}
                  onRemovePhoto={handleRemovePhoto}
                  onRemovePending={handleRemovePending}
                  onSetCover={handleSetCover}
                  onSetPendingCover={handleSetPendingCover}
                  onBusyChange={setPhotoBusy}
                  disabled={submitting}
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
