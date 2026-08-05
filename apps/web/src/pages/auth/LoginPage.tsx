import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Button } from "@/components/shadcn/button";

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
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <p className="text-sm text-muted-foreground">Acesse o painel da sua ONG.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Ainda não tem conta? <Link to="/registrar" className="font-semibold text-primary">Cadastre sua ONG</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
