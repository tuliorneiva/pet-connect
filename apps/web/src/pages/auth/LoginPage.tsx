import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import styles from "./authForm.module.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Card>
        <h1 className={styles.title}>Entrar</h1>
        <form onSubmit={onSubmit}>
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className={styles.actions}>
            <Button type="submit" className={styles.full} disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </div>
        </form>
        <p className={styles.switch}>
          Ainda não tem conta? <Link to="/registrar">Cadastre sua ONG</Link>
        </p>
      </Card>
    </div>
  );
}
