import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Info, LayoutDashboard, Plus } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { adminApi } from "../../lib/adminApi";
import { resizeImage } from "@/lib/resizeImage";
import { Card, CardContent } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Textarea } from "@/components/shadcn/textarea";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = { 1: "Conta", 2: "Perfil", 3: "Pronto" };

function Stepper({ step }: { step: Step }) {
  return (
    <div className="mx-auto mb-7 flex max-w-[280px] flex-col gap-2">
      <div className="flex items-center">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            {i > 0 && (
              <div className={cn("h-0.5 w-14", s <= step ? "bg-primary" : "bg-secondary")} />
            )}
            <div
              className={cn(
                "grid h-7 w-7 flex-none place-items-center rounded-full border-2 text-xs font-bold",
                s < step && "border-primary bg-primary text-primary-foreground",
                s === step && "border-primary bg-card text-primary",
                s > step && "border-secondary bg-secondary text-muted-foreground",
              )}
            >
              {s < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
        {([1, 2, 3] as Step[]).map((s) => (
          <span key={s} className={cn("w-7 text-center", s === step && "text-primary")}>
            {STEP_LABELS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [account, setAccount] = useState({ org_name: "", city: "", name: "", email: "", password: "" });
  const [profile, setProfile] = useState({ description: "", phone: "", email: "", website: "", founded_year: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  function updateAccount(key: keyof typeof account) {
    return (e: ChangeEvent<HTMLInputElement>) => setAccount((f) => ({ ...f, [key]: e.target.value }));
  }
  function updateProfile(key: keyof typeof profile) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setProfile((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submitAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...account, city: account.city || undefined });
      setOrgName(account.org_name);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProfileAndContinue() {
    setError(null);
    setSubmitting(true);
    try {
      const org = await adminApi.updateOrganization({
        description: profile.description || null,
        phone: profile.phone || null,
        email: profile.email || null,
        website: profile.website || null,
        founded_year: profile.founded_year ? Number(profile.founded_year) : null,
      });
      if (logoFile) await adminApi.uploadLogo(logoFile);
      setOrgSlug(org.slug);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar o perfil");
    } finally {
      setSubmitting(false);
    }
  }

  async function skipProfile() {
    // O slug já existe desde o cadastro (passo 1); só não o guardamos localmente
    // até agora porque até aqui não fazia diferença pra tela.
    try {
      const org = await adminApi.getOrganization();
      setOrgSlug(org.slug);
    } catch {
      /* segue sem o slug — o passo 3 não depende dele para navegar */
    }
    setStep(3);
  }

  function handleLogoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) resizeImage(file).then(setLogoFile);
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <Stepper step={step} />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Passo 1 de 3</p>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight">Crie a conta da sua ONG</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Leva menos de um minuto. Você completa o perfil da organização no próximo passo — e pode
              editar tudo depois.
            </p>
            <form onSubmit={submitAccount} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="org_name">Nome da ONG</Label>
                <Input id="org_name" value={account.org_name} onChange={updateAccount("org_name")}
                       placeholder="Ex.: Abrigo Amigo Fiel" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={account.city} onChange={updateAccount("city")} placeholder="João Pessoa" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Seu nome</Label>
                <Input id="name" value={account.name} onChange={updateAccount("name")}
                       placeholder="Como a equipe vai te chamar" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={account.email} onChange={updateAccount("email")}
                       placeholder="voce@suaong.org" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={account.password} onChange={updateAccount("password")}
                       required maxLength={72} placeholder="Mínimo 8 caracteres" />
              </div>
              <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                {submitting ? "Criando conta…" : "Continuar"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta? <Link to="/login" className="font-semibold text-primary">Entrar</Link>
            </p>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Passo 2 de 3</p>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight">Complete o perfil da ONG</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              É isso que aparece pra quem visita sua página pública. Pode pular e preencher depois,
              quando quiser.
            </p>

            <div className="mb-5 flex items-center gap-4">
              <div className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#22D3EE] to-primary text-white">
                {logoFile ? (
                  <img src={URL.createObjectURL(logoFile)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Plus className="h-6 w-6" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Logo da ONG (opcional)</p>
                <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-card px-3.5 text-xs font-semibold hover:bg-slate-50">
                  Enviar imagem
                  <input type="file" aria-label="Enviar imagem" accept="image/jpeg,image/png,image/webp"
                         onChange={handleLogoPick} className="sr-only" />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="descricao">Sobre a ONG</Label>
                <Textarea id="descricao" value={profile.description} onChange={updateProfile("description")}
                          placeholder="Conte a história da sua ONG e o que faz seus animais especiais." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={profile.phone} onChange={updateProfile("phone")} placeholder="(83) 90000-0000" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contato">E-mail de contato</Label>
                  <Input id="contato" value={profile.email} onChange={updateProfile("email")} placeholder="contato@suaong.org" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site">Site</Label>
                  <Input id="site" value={profile.website} onChange={updateProfile("website")} placeholder="suaong.org" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ano">Ano de fundação</Label>
                  <Input id="ano" type="number" value={profile.founded_year} onChange={updateProfile("founded_year")} placeholder="2019" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2.5">
              <Button type="button" variant="secondary" onClick={skipProfile} disabled={submitting}>
                Pular por enquanto
              </Button>
              <Button type="button" className="flex-1" onClick={saveProfileAndContinue} disabled={submitting}>
                {submitting ? "Salvando…" : "Salvar e continuar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="flex flex-col items-center pb-7 pt-8 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Tudo pronto</p>
            <h1 className="mb-1.5 text-xl font-bold tracking-tight">{orgName || "Sua ONG"} está no ar</h1>
            <p className="mb-7 max-w-xs text-sm text-muted-foreground">
              Sua página pública já existe. Agora é só cadastrar os animais pra começar a aparecer na
              vitrine de adoção.
            </p>

            <div className="flex w-full flex-col gap-2.5 text-left">
              <button
                type="button"
                onClick={() => navigate("/admin/animais/novo")}
                className="flex items-center gap-3.5 rounded-lg border border-primary bg-accent px-4 py-3.5 text-left transition hover:bg-[#CFFAFE]"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-primary text-primary-foreground">
                  <Plus className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">Cadastrar meu primeiro animal</span>
                  <span className="block text-xs text-muted-foreground">Leva pra tela de novo animal, com upload de fotos</span>
                </span>
                <ArrowRight className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-3.5 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-secondary text-muted-foreground">
                  <LayoutDashboard className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">Ir para o painel</span>
                  <span className="block text-xs text-muted-foreground">Explorar o sistema por conta própria</span>
                </span>
                <ArrowRight className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-md bg-secondary px-3 py-2.5 text-left text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span>
                Sem animais cadastrados, sua página {orgSlug && <>(<code>/ongs/{orgSlug}</code>)</>} fica
                no ar mas vazia — nada aparece na vitrine pública até o primeiro cadastro.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
