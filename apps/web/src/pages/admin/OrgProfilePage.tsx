import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import type { OrganizationProfile, OrganizationProfileInput } from "../../lib/types";
import { Card, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Textarea } from "@/components/shadcn/textarea";
import { OrgLogoUploader } from "@/components/admin/OrgLogoUploader";

const EMPTY: OrganizationProfileInput = {
  name: "",
  city: "",
  description: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  founded_year: null,
  whatsapp: "",
  instagram: "",
  facebook: "",
  pix_key: "",
};

function toForm(org: OrganizationProfile): OrganizationProfileInput {
  return {
    name: org.name,
    city: org.city ?? "",
    description: org.description ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    website: org.website ?? "",
    address: org.address ?? "",
    founded_year: org.founded_year,
    whatsapp: org.whatsapp ?? "",
    instagram: org.instagram ?? "",
    facebook: org.facebook ?? "",
    pix_key: org.pix_key ?? "",
  };
}

/** "" vira null: campo opcional vazio não deve virar string vazia salva no banco. */
function toPayload(f: OrganizationProfileInput): OrganizationProfileInput {
  return {
    ...f,
    city: f.city || null,
    description: f.description || null,
    email: f.email || null,
    phone: f.phone || null,
    website: f.website || null,
    address: f.address || null,
    whatsapp: f.whatsapp || null,
    instagram: f.instagram || null,
    facebook: f.facebook || null,
    pix_key: f.pix_key || null,
  };
}

export function OrgProfilePage() {
  const navigate = useNavigate();
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [form, setForm] = useState<OrganizationProfileInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi.getOrganization().then((o) => {
      setOrg(o);
      setForm(toForm(o));
    });
  }, []);

  function set<K extends keyof OrganizationProfileInput>(key: K, value: OrganizationProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.updateOrganization(toPayload(form));
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!org) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <section>
      <div data-testid="form-header" className="mb-5 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Perfil da ONG</h1>
          <p className="text-sm text-muted-foreground">
            Estas informações aparecem na página pública da sua organização
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin")}>
            Cancelar
          </Button>
          <Button type="submit" form="org-profile-form" disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar alterações"}
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

      <Card className="mb-5">
        <CardContent className="pt-6">
          <p className="mb-1 text-sm font-bold">Logo</p>
          <p className="mb-4 text-xs text-muted-foreground">JPG, PNG ou WEBP · até 1 MB</p>
          <OrgLogoUploader
            logoUrl={org.logo_url}
            onUpload={async (file) => setOrg(await adminApi.uploadLogo(file))}
            onRemove={async () => setOrg(await adminApi.deleteLogo())}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-1 text-sm font-bold">Dados da organização</p>
          <p className="mb-5 text-xs text-muted-foreground">
            Nome e cidade foram definidos no cadastro; o resto é opcional, mas ajuda quem visita a página.
          </p>

          <form id="org-profile-form" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome da ONG</Label>
                <Input id="nome" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(83) 90000-0000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail de contato</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contato@suaong.org"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  value={form.website ?? ""}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="suaong.org"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fundacao">Ano de fundação</Label>
                <Input
                  id="fundacao"
                  type="number"
                  value={form.founded_year ?? ""}
                  onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)}
                  placeholder="2019"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Rua, número, bairro — cidade/UF"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="descricao">Sobre a ONG</Label>
                <Textarea
                  id="descricao"
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Conte a história da sua ONG e o que faz seus animais especiais."
                />
              </div>
            </div>

            <div className="my-6 h-px bg-border" />

            <p className="mb-1 text-sm font-bold">Redes sociais</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Opcional. Preenchidas, aparecem como ícones na sua página pública.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp ?? ""}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="(83) 90000-0000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={form.instagram ?? ""}
                  onChange={(e) => set("instagram", e.target.value)}
                  placeholder="@suaong"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={form.facebook ?? ""}
                  onChange={(e) => set("facebook", e.target.value)}
                  placeholder="suaong"
                />
              </div>
            </div>

            <div className="my-6 h-px bg-border" />

            <p className="mb-1 text-sm font-bold">Doações</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Opcional. Preenchida, aparece junto com o contato na sua página pública.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pix">Chave Pix</Label>
              <Input
                id="pix"
                value={form.pix_key ?? ""}
                onChange={(e) => set("pix_key", e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              />
            </div>
          </form>

          <div className="my-6 h-px bg-border" />

          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <span className="font-semibold">Endereço público:</span>
            <code className="rounded bg-secondary px-2 py-0.5 text-xs">
              petconnecta.app/ongs/{org.slug}
            </code>
            {org.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <Check className="h-3 w-3" aria-hidden="true" /> Verificada pela plataforma
              </span>
            )}
          </div>
          <div className="mt-3.5 flex items-start gap-2 rounded-md bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground" aria-hidden="true" />
            <span>
              O endereço da página e o selo de verificação não são editáveis aqui — mudar o
              endereço quebraria links já compartilhados, e o selo é atribuído pela equipe do
              PetConnecta.
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
