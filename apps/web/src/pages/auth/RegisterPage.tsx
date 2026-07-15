import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Button } from "@/components/shadcn/button";

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
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cadastrar ONG</CardTitle>
          <p className="text-sm text-muted-foreground">Crie o acesso da sua organização.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org_name">Nome da ONG</Label>
              <Input id="org_name" value={form.org_name} onChange={update("org_name")} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={form.city} onChange={update("city")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" value={form.name} onChange={update("name")} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={form.password} onChange={update("password")} required maxLength={72} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Cadastrando…" : "Cadastrar"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-semibold text-primary">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
