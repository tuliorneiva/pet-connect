import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import type { SupportType } from "../../lib/types";
import { SUPPORT_TYPE_LABELS } from "../../lib/labels";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import styles from "./public.module.css";

const TYPE_OPTIONS = Object.entries(SUPPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function AnimalPublicPage() {
  const { id } = useParams();
  const animalId = Number(id);
  const { data, loading, error } = useAsync(() => publicApi.getAnimal(animalId), [animalId]);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Link to="/" className={styles.backLink}>← Voltar à vitrine</Link>
      {loading && <p className={styles.empty}>Carregando…</p>}
      {error && <p className={styles.empty}>Animal não encontrado.</p>}
      {data && (
        <div className={styles.detail}>
          {data.photo_url ? (
            <img className={styles.detailPhoto} src={data.photo_url} alt={data.name} />
          ) : (
            <div className={styles.noPhoto} style={{ borderRadius: "var(--radius-md)" }}>🐾</div>
          )}
          <div>
            <h1 className={styles.detailName}>{data.name}</h1>
            <p className={styles.cardMeta}>
              {data.species}
              {data.breed ? ` · ${data.breed}` : ""}
              {data.sex ? ` · ${data.sex}` : ""}
              {data.size ? ` · porte ${data.size}` : ""}
              {data.birth_estimate ? ` · ${data.birth_estimate}` : ""}
            </p>
            {data.description && <p style={{ marginTop: "var(--space-4)" }}>{data.description}</p>}
            <div style={{ marginTop: "var(--space-6)" }}>
              <Button onClick={() => setOpen(true)}>Tenho interesse</Button>
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

function InterestModal({ open, onClose, animalId, animalName }: { open: boolean; onClose: () => void; animalId: number; animalName: string }) {
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
      setError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Interesse em ${animalName}`}>
      {done ? (
        <div>
          <Alert variant="success">Solicitação enviada! A ONG entrará em contato.</Alert>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          {error && <Alert variant="error">{error}</Alert>}
          <Select label="Tipo de apoio" options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value as SupportType)} />
          <Field label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field label="Mensagem" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button type="submit" disabled={submitting}>{submitting ? "Enviando…" : "Enviar solicitação"}</Button>
        </form>
      )}
    </Modal>
  );
}
