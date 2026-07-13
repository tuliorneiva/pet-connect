import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../lib/adminApi";
import { useAsync } from "../../lib/useAsync";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { animalStatusTone } from "../../lib/labels";
import styles from "./admin.module.css";

type Tab = "vacinas" | "medicacoes" | "prontuario";

export function AnimalDetailPage() {
  const { id } = useParams();
  const animalId = Number(id);
  const [tab, setTab] = useState<Tab>("vacinas");
  const animal = useAsync(() => adminApi.getAnimal(animalId), [animalId]);

  return (
    <section>
      <Link to="/admin/animais" className={styles.backLink}>← Voltar aos animais</Link>
      {animal.data && (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>{animal.data.name}</h1>
            <Badge tone={animalStatusTone(animal.data.status)}>{animal.data.status}</Badge>
          </div>
          <Card style={{ marginBottom: "var(--space-6)" }}>
            <p className={styles.muted}>
              {animal.data.species}
              {animal.data.breed ? ` · ${animal.data.breed}` : ""}
              {animal.data.sex ? ` · ${animal.data.sex}` : ""}
              {animal.data.size ? ` · porte ${animal.data.size}` : ""}
              {animal.data.birth_estimate ? ` · ${animal.data.birth_estimate}` : ""}
            </p>
            {animal.data.description && <p>{animal.data.description}</p>}
          </Card>

          <div className={styles.tabs}>
            <button className={tab === "vacinas" ? styles.tabActive : styles.tab} onClick={() => setTab("vacinas")}>Vacinas</button>
            <button className={tab === "medicacoes" ? styles.tabActive : styles.tab} onClick={() => setTab("medicacoes")}>Medicações</button>
            <button className={tab === "prontuario" ? styles.tabActive : styles.tab} onClick={() => setTab("prontuario")}>Prontuário</button>
          </div>

          {tab === "vacinas" && <VaccinationsTab animalId={animalId} />}
          {tab === "medicacoes" && <MedicationsTab animalId={animalId} />}
          {tab === "prontuario" && <RecordsTab animalId={animalId} />}
        </>
      )}
    </section>
  );
}

function VaccinationsTab({ animalId }: { animalId: number }) {
  const { data, reload } = useAsync(() => adminApi.listVaccinations(animalId), [animalId]);
  const [name, setName] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [appliedAt, setAppliedAt] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    await adminApi.createVaccination(animalId, {
      vaccine_name: name,
      due_at: dueAt || null,
      applied_at: appliedAt || null,
    });
    setName(""); setDueAt(""); setAppliedAt("");
    reload();
  }

  async function remove(vid: number) {
    await adminApi.deleteVaccination(animalId, vid);
    reload();
  }

  return (
    <div>
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <form onSubmit={add} className={styles.formRow}>
          <Field label="Vacina" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Aplicada em" type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
          <Field label="Vence em" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>
      {data && data.length === 0 && <p className={styles.muted}>Nenhuma vacina registrada.</p>}
      {data && data.length > 0 && (
        <table className={styles.table}>
          <thead><tr><th>Vacina</th><th>Aplicada</th><th>Vence</th><th></th></tr></thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.id}>
                <td>{v.vaccine_name}</td>
                <td>{v.applied_at ?? <Badge tone="warning">pendente</Badge>}</td>
                <td>{v.due_at ?? "—"}</td>
                <td><Button variant="ghost" onClick={() => remove(v.id)}>Remover</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MedicationsTab({ animalId }: { animalId: number }) {
  const { data, reload } = useAsync(() => adminApi.listMedications(animalId), [animalId]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [nextDose, setNextDose] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    await adminApi.createMedication(animalId, {
      name,
      dosage: dosage || null,
      next_dose_at: nextDose || null,
    });
    setName(""); setDosage(""); setNextDose("");
    reload();
  }

  async function remove(mid: number) {
    await adminApi.deleteMedication(animalId, mid);
    reload();
  }

  return (
    <div>
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <form onSubmit={add} className={styles.formRow}>
          <Field label="Medicação" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Dosagem" value={dosage} onChange={(e) => setDosage(e.target.value)} />
          <Field label="Próxima dose" type="date" value={nextDose} onChange={(e) => setNextDose(e.target.value)} />
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>
      {data && data.length === 0 && <p className={styles.muted}>Nenhuma medicação registrada.</p>}
      {data && data.length > 0 && (
        <table className={styles.table}>
          <thead><tr><th>Medicação</th><th>Dosagem</th><th>Próxima dose</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.dosage ?? "—"}</td>
                <td>{m.next_dose_at ?? "—"}</td>
                <td>{m.status}</td>
                <td><Button variant="ghost" onClick={() => remove(m.id)}>Remover</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RecordsTab({ animalId }: { animalId: number }) {
  const { data, reload } = useAsync(() => adminApi.listRecords(animalId), [animalId]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordedAt, setRecordedAt] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    await adminApi.createRecord(animalId, {
      title,
      description: description || null,
      recorded_at: recordedAt || null,
    });
    setTitle(""); setDescription(""); setRecordedAt("");
    reload();
  }

  async function remove(rid: number) {
    await adminApi.deleteRecord(animalId, rid);
    reload();
  }

  return (
    <div>
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <form onSubmit={add} className={styles.formRow}>
          <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Field label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Field label="Data" type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>
      {data && data.length === 0 && <p className={styles.muted}>Nenhum registro no prontuário.</p>}
      {data && data.length > 0 && (
        <table className={styles.table}>
          <thead><tr><th>Data</th><th>Título</th><th>Descrição</th><th></th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{r.recorded_at ?? "—"}</td>
                <td>{r.title}</td>
                <td>{r.description ?? "—"}</td>
                <td><Button variant="ghost" onClick={() => remove(r.id)}>Remover</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
