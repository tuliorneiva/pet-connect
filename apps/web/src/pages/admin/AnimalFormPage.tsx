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
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import styles from "./admin.module.css";

const EMPTY: AnimalInput = {
  name: "",
  species: "cão",
  breed: "",
  sex: "",
  size: "",
  birth_estimate: "",
  description: "",
  photo_url: "",
  status: "disponível",
};

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
          sex: a.sex ?? "",
          size: a.size ?? "",
          birth_estimate: a.birth_estimate ?? "",
          description: a.description ?? "",
          photo_url: a.photo_url ?? "",
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
      if (editing) {
        await adminApi.updateAnimal(id!, form);
      } else {
        await adminApi.createAnimal(form);
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
          <Field label="Nome" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <div className={styles.grid2}>
            <Select label="Espécie" options={SPECIES_OPTIONS} value={form.species} onChange={(e) => set("species", e.target.value)} />
            <Field label="Raça" value={form.breed ?? ""} onChange={(e) => set("breed", e.target.value)} />
            <Select label="Sexo" options={SEX_OPTIONS} placeholder="—" value={form.sex ?? ""} onChange={(e) => set("sex", e.target.value)} />
            <Select label="Porte" options={SIZE_OPTIONS} placeholder="—" value={form.size ?? ""} onChange={(e) => set("size", e.target.value)} />
            <Field label="Idade estimada" value={form.birth_estimate ?? ""} onChange={(e) => set("birth_estimate", e.target.value)} placeholder="ex.: 2 anos" />
            <Select label="Situação" options={ANIMAL_STATUS_OPTIONS} value={form.status} onChange={(e) => set("status", e.target.value as AnimalInput["status"])} />
          </div>
          <Field label="Foto (URL)" value={form.photo_url ?? ""} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://…" />
          <Field label="Descrição" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          <div className={styles.rowActions}>
            <Button type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/animais")}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
