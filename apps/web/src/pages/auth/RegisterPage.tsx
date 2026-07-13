import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import styles from "./authForm.module.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ org_name: "", city: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...form, city: form.city || undefined });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Card>
        <h1 className={styles.title}>Cadastrar ONG</h1>
        <form onSubmit={onSubmit}>
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="Nome da ONG" value={form.org_name} onChange={update("org_name")} required />
          <Field label="Cidade" value={form.city} onChange={update("city")} />
          <Field label="Seu nome" value={form.name} onChange={update("name")} required />
          <Field label="E-mail" type="email" value={form.email} onChange={update("email")} required />
          <Field label="Senha" type="password" value={form.password} onChange={update("password")} required maxLength={72} />
          <div className={styles.actions}>
            <Button type="submit" className={styles.full} disabled={submitting}>
              {submitting ? "Cadastrando…" : "Cadastrar"}
            </Button>
          </div>
        </form>
        <p className={styles.switch}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </Card>
    </div>
  );
}
