import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../lib/adminApi";
import type { AnimalInput } from "../../lib/types";
import {
  ANIMAL_STATUS_OPTIONS,
  SEX_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
} from "../../lib/labels";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import styles from "./admin.module.css";

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
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<AnimalInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      adminApi.getAnimal(id!).then((a) =>
        setForm({
          name: a.name,
          species: a.species,
          breed: a.breed ?? "",
          sex: a.sex ?? null,
          size: a.size ?? null,
          birth_estimate: a.birth_estimate ?? "",
          description: a.description ?? "",
          status: a.status,
        }),
      );
    }
  }, [id]);

  function set<K extends keyof AnimalInput>(key: K, value: AnimalInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = toPayload(form);
      if (editing) {
        await adminApi.updateAnimal(id!, payload);
      } else {
        await adminApi.createAnimal(payload);
      }
      navigate("/admin/animais");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1 className={styles.title}>{editing ? "Editar animal" : "Novo animal"}</h1>
      <Card style={{ maxWidth: 640, marginTop: "var(--space-4)" }}>
        <form onSubmit={onSubmit}>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>

            <div className={styles.grid2}>
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
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <div className={`${styles.rowActions} mt-4`}>
            <Button type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/animais")}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
