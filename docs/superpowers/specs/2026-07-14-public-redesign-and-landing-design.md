# Redesign público + Landing page — Design

**Data:** 2026-07-14
**Branch base:** `feat/foundation-and-auth`
**Status:** aprovado (mockups validados pelo usuário)

## 1. Objetivo

Modernizar o visual das telas públicas do PetConnect com **shadcn/ui** e criar uma **landing page** (`/lp`) que apresente o PetConnect como um serviço real (não um projeto de faculdade), levando o visitante à listagem de animais. Nesta rodada entram três páginas principais, todas com dados reais:

1. **Landing `/lp`** — foco no adotante.
2. **Home `/`** — listagem de animais (restyle).
3. **View pública da ONG `/ongs/:slug`** — perfil do abrigo com seus animais (página nova, backend novo).

Além disso, restilizar as telas públicas/auth de apoio (detalhe do animal, login, registro, layout público) para consistência.

Mockups de referência (aprovados): `docs/mockups/lp.html`, `docs/mockups/home.html`, `docs/mockups/ong.html`.

## 2. Escopo

**Dentro:**
- Fundação: Tailwind v4 + shadcn/ui, mapeando os tokens teal existentes.
- Restyle: Home (listagem), detalhe do animal, login, registro, `PublicLayout`.
- Nova landing `/lp` (layout próprio, foco no adotante).
- Nova view pública da ONG `/ongs/:slug` + backend correspondente.
- Enriquecer o modelo `Organization` e o `PublicAnimalResponse` para suportar as páginas.
- Atualizar seed para popular os novos campos (demo realista).

**Fora (próxima rodada):**
- View **interna da agência** (painel/admin da ONG): dashboard, CRUD de animais, saúde, solicitações. As telas admin continuam usando os componentes CSS-module atuais e **não** são migradas agora.
- Fluxos novos de doação/voluntariado (os CTAs da página da ONG apontam para contato/placeholder).

## 3. Direção visual

Herda a memória de design do projeto (**light-mode only**, sóbrio/institucional, acento **teal `#0E7490`**). Os tokens atuais em `src/styles/tokens.css` são a fonte de verdade e serão mapeados para as variáveis do shadcn.

- Acento único teal; tintas de seção teal-50 (`#F0FDFA`/`#ECFEFF`); neutros com leve viés frio.
- Cards com hover elevado, badges arredondadas, sombras sutis, foco visível (acessibilidade).
- Sem dark mode (decisão do projeto).
- Tipografia: manter `system-ui` (o app já usa; opcional plugar fonte de display depois).

## 4. Fundação: Tailwind v4 + shadcn/ui

- Adicionar **Tailwind v4** via plugin `@tailwindcss/vite` (compatível com Vite 8 / React 19).
- Inicializar **shadcn/ui**: `components.json`, `src/lib/utils.ts` (`cn`), tema em CSS variables.
- **Mapear os tokens teal** para as variáveis do shadcn (`--primary`, `--background`, `--foreground`, `--border`, `--muted`, `--card`, `--ring`, …) usando os hex existentes. Definir apenas `:root` (sem bloco `.dark`).
- Instalar primitivos conforme necessidade: `button, card, badge, input, label, select, separator, skeleton`.
- **Sem regressão:** os componentes em `src/components/ui/*` (CSS Modules) permanecem para o admin. Novos componentes shadcn ficam em `src/components/ui/` seguindo a convenção do shadcn (nomes minúsculos, ex. `button.tsx`) — não colidem com os existentes (`Button.tsx` etc.). Se houver colisão de nome no filesystem case-insensitive, usar subpasta ou prefixo. Testes existentes (`Button.test`, `Field.test`, `LoginPage.test`) devem continuar passando; atualizar `LoginPage.test.tsx` se o markup mudar.

## 5. Backend

### 5.1 Modelo `Organization` (novas colunas, todas opcionais)
`description`, `email`, `phone`, `website`, `address`, `founded_year` (int), `verified` (bool, default `false`), `logo_url` (opcional). Migration Alembic nova (`0003_organization_public_profile`).

### 5.2 `PublicAnimalResponse` — incluir dados da ONG
Adicionar `org_name` e `org_city` (e `org_slug`) derivados do relacionamento `Animal.organization`. Adicionar o relacionamento no modelo `Animal` se ainda não existir. Necessário para os cards de listagem/destaque mostrarem "Cidade · ONG".

### 5.3 Endpoints públicos novos (router `public.py`)
- `GET /api/public/organizations/{slug}` → schema `PublicOrganizationResponse`: dados da ONG + estatísticas computadas (`available_count`, `adopted_count`). Retorna 404 se não existir.
- Filtro por ONG na listagem: adicionar parâmetro `org` (slug) em `GET /api/public/animals`, para a página da ONG buscar os animais disponíveis do abrigo.

### 5.4 Seed
Atualizar `app/seed.py` para preencher os novos campos da(s) organização(ões) demo (descrição, contato, `verified=true`, `founded_year`) e garantir animais com status `adotado` suficientes para a estatística de adoções fazer sentido.

## 6. Frontend — páginas

### 6.1 Landing `/lp` (nova, layout próprio)
Rota fora do `PublicLayout` (chrome de marketing própria: navbar sticky + footer). Seções (conforme mockup):
- Navbar: logo, âncoras (Como funciona, Animais, Por que nós, Para ONGs), botões Entrar + "Ver animais".
- Hero: eyebrow, headline emocional, lede, CTA primário **→ `/`**, CTA "Como funciona", trust stats.
- Como funciona (3 passos: Busque → Conheça → Adote).
- **Destaques**: cards de **animais reais** via `publicApi.listAnimals` (limitar a ~4 no cliente). CTA "Ver todos" → `/`.
- Por que PetConnect (features).
- Faixa para ONGs → `/registrar`.
- CTA final + footer.
Estados: se a chamada de destaques falhar/vazia, ocultar a seção (a landing não quebra).

### 6.2 Home `/` (restyle)
Reescrever `HomePage` com shadcn: cabeçalho com breadcrumb, barra de filtros (Select espécie/porte/sexo + Input cidade), contador de resultados, grade de `Card` com `Badge`, estados de **loading (Skeleton)**, erro e vazio. Cards mostram cidade · ONG (novos campos). Ordenação client-side opcional (não crítico). Mantém a lógica de `useAsync` + `publicApi` atual.

### 6.3 Detalhe do animal `/animais/:id` (restyle)
Reescrever `AnimalPublicPage` com shadcn (Card, Badge). Link para a ONG (`/ongs/:slug`) usando `org_slug`. Mantém o formulário de solicitação de apoio existente, restilizado.

### 6.4 View da ONG `/ongs/:slug` (nova)
Layout conforme mockup: capa + avatar, nome + selo `verified` (só se `true`), meta (cidade, "parceira desde" = ano de `created_at`, nº de disponíveis), "Sobre" (`description`), stats (`available_count`, `adopted_count`, `founded_year`), grade dos animais da ONG (`?org=slug`), sidebar com "Quer ajudar?" (CTAs placeholder) + contato (só campos preenchidos). Campos ausentes são **omitidos** (nada inventado no runtime). Novo `publicApi.getOrganization(slug)`.

### 6.5 Login / Registro (restyle)
Reescrever com shadcn (`Card`, `Input`, `Label`, `Button`). Preservar lógica de `AuthContext`/submit. Atualizar `LoginPage.test.tsx` se necessário.

### 6.6 `PublicLayout` (restyle)
Header/footer atualizados para casar com o novo visual (não a navbar de marketing da `/lp`, que é própria).

## 7. Rotas (App.tsx)
- Adicionar `/lp` como rota **standalone** (fora de `PublicLayout`).
- Adicionar `/ongs/:slug` dentro do `PublicLayout`.
- `/` permanece a listagem. Todos os CTAs de adoção da `/lp` apontam para `/`.

## 8. Tipos / API client (web)
- `types.ts`: estender `PublicAnimal` com `org_name`, `org_city`, `org_slug`; adicionar `PublicOrganization`.
- `publicApi.ts`: adicionar `getOrganization(slug)` e suportar filtro `org` em `listAnimals`.

## 9. Testes e verificação
- API: testes para o endpoint de organização pública (200 com stats, 404 inexistente) e para os novos campos em `PublicAnimalResponse`; manter suíte atual verde (`pytest`).
- Web: manter/atualizar testes existentes; `npm run lint`, `npm run test`, `npm run build`.
- Rodar o app e conferir `/lp`, `/`, `/ongs/:slug`, detalhe, login/registro renderizando com dados reais do seed.

## 10. Riscos / notas
- Colisão de nomes de arquivo shadcn (`button.tsx`) vs existentes (`Button.tsx`) em FS case-insensitive — mitigar com convenção de pasta.
- Migration precisa rodar no ambiente (docker-compose) antes do seed.
- `org_slug` deve estar presente no `PublicAnimalResponse` para os links de card → página da ONG funcionarem.
