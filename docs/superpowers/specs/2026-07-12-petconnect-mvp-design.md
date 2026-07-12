# PetConnect (PetConecta) — Design do MVP

- **Data:** 2026-07-12
- **Contexto:** Projeto de extensão (UFPB / Centro de Informática). Período 01/06/2026–13/08/2026, 60h, 4 integrantes.
- **Proposta original:** `docs/pet-connect.md`
- **Status:** Design aprovado — pronto para plano de implementação.

## 1. Visão geral

Plataforma web para gestão de abrigos de animais (ONGs/protetores) e impulso à
adoção responsável. Sistema duplo:

- **Área administrativa (autenticada):** gestão de saúde dos animais (prontuário,
  vacinas, medicações) e dashboard de alertas automáticos.
- **Área pública (anônima):** vitrine digital de animais para adoção + formulário
  de interesse (adoção / lar temporário / apadrinhamento).

## 2. Escopo

### Dentro do MVP
- Auto-registro de ONG + login de admin (JWT).
- Multi-tenant: cada ONG só enxerga/edita os próprios dados.
- CRUD de animais (com status e foto por URL).
- Gestão de saúde: vacinas, medicações, prontuário/anotações clínicas.
- Motor de alertas (vacinas pendentes/atrasadas, medicações com dose vencida) +
  dashboard.
- Vitrine pública com filtros.
- Formulário público de interesse (tipo: adoção / lar temporário / apadrinhamento).
- Gestão das solicitações recebidas pelo admin (mudar status).
- Testes (pytest + Vitest), lint/format, README, seed de demonstração.

### Fora do MVP (extensão futura — documentado, não implementado)
- Estoque de insumos.
- Escalas de voluntários.
- Upload de arquivo de imagem (disco/S3) — MVP usa URL de foto.
- Super-admin global da plataforma.
- Conta/perfil para o público adotante.
- Fluxos separados e completos por modalidade de apoio.

## 3. Papéis e controle de acesso (RBAC)

Existe **um único papel autenticado: Admin da ONG**. O "público" são visitantes
anônimos (sem login). O controle de acesso se dá em duas dimensões:

1. **Autenticado vs. anônimo** — rotas admin exigem JWT; rotas públicas são abertas.
2. **Isolamento por ONG (multi-tenant)** — todo acesso admin é escopado pelo
   `org_id` do usuário do token. Admin da ONG A nunca acessa dados da ONG B.

**Entrada de uma ONG no sistema:** o admin se auto-registra numa tela "Criar conta
da ONG" (nome da ONG + dados de login). Esse primeiro usuário vira admin daquela
ONG. (Convidar outros admins da mesma ONG é possível mas opcional no MVP.)

## 4. Arquitetura

SPA React (Vite) → API REST FastAPI (`/api/...`) → PostgreSQL via SQLAlchemy.
Fotos são URLs externas (campo de texto). Auth via JWT no header `Authorization`.
Orquestração local com `docker-compose` (postgres + api + web).

### Estrutura do monorepo (duas pastas, sem tooling JS pesado)

```
pet-connect/
├── docs/
│   ├── pet-connect.md
│   └── superpowers/specs/
├── apps/
│   ├── api/                        # FastAPI
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/               # config, security (JWT), deps
│   │   │   ├── models/             # SQLAlchemy
│   │   │   ├── schemas/            # Pydantic
│   │   │   ├── routers/            # endpoints por domínio
│   │   │   ├── services/           # regras de negócio (motor de alertas)
│   │   │   └── db/                 # session, base
│   │   ├── alembic/                # migrações
│   │   ├── tests/                  # pytest
│   │   └── pyproject.toml
│   └── web/                        # React + Vite + TS
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── features/           # animais, saúde, alertas, solicitações
│       │   ├── lib/                # api client, auth
│       │   └── router.tsx
│       └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

### Stack
- **Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic, JWT, hash de senha
  (bcrypt/argon2), Ruff.
- **Frontend:** React, Vite, TypeScript, React Router, ESLint + Prettier.
- **Banco:** PostgreSQL.
- **Infra:** docker-compose local.

## 5. Modelo de dados

Multi-tenant: entidades de dados da ONG penduram em `organization`.

**`organization`** — a ONG
`id, name, slug, city, created_at`

**`user`** — login de admin (pertence a uma ONG)
`id, org_id (FK), name, email (unique), password_hash, created_at`

**`animal`**
`id, org_id (FK), name, species (cão/gato/outro), breed, sex, size (P/M/G),
birth_estimate, description, photo_url, status (disponível/em_processo/adotado/
indisponível), created_at`

**`vaccination`**
`id, animal_id (FK), vaccine_name, applied_at (nullable = ainda não aplicada),
due_at (quando vence/deve ser aplicada), notes`

**`medication`**
`id, animal_id (FK), name, dosage, start_at, end_at (nullable),
next_dose_at (nullable), status (ativa/concluída), notes`

**`medical_record`** — prontuário/anotação clínica
`id, animal_id (FK), title, description, recorded_at, created_by (FK user)`

**`support_request`** — solicitação do público
`id, animal_id (FK), type (adoção/lar_temporário/apadrinhamento), requester_name,
requester_email, requester_phone, message, status (nova/em_análise/aprovada/
recusada/concluída), created_at`

### Notas de modelagem
- O **motor de alertas** não é tabela — é calculado por query.
- `support_request` guarda dados do solicitante direto (público não tem conta).
- Todo acesso admin filtra por `org_id` do JWT.

## 6. API

### Pública (sem login)
- `GET /api/public/animals` — vitrine: animais `disponível` de todas as ONGs, com
  filtros (espécie, porte, sexo, cidade).
- `GET /api/public/animals/{id}` — detalhe.
- `POST /api/public/support-requests` — envia formulário de interesse.

### Auth
- `POST /api/auth/register` — cria ONG + primeiro admin.
- `POST /api/auth/login` — retorna JWT.
- `GET /api/auth/me` — usuário logado.

### Admin (JWT, escopado por `org_id`)
- `animals` — CRUD (inclui status).
- `animals/{id}/vaccinations` — CRUD.
- `animals/{id}/medications` — CRUD.
- `animals/{id}/medical-records` — CRUD.
- `support-requests` — listar/ver/atualizar status (não cria).
- `GET /api/admin/dashboard/alerts` — motor de alertas da ONG.

### Motor de alertas (regra de negócio)
Calculado em query sobre os dados da ONG:
- **Vacina pendente/atrasada:** `applied_at` nulo e `due_at` não nulo. Nível:
  `atrasado` se `due_at < hoje`; `pendente` se `due_at` dentro dos próximos 7 dias.
- **Medicação com dose vencida:** `status = ativa` e `next_dose_at <= hoje`.
- Cada item retorna animal, tipo, descrição e nível (pendente/atrasado).

## 7. Frontend — telas
- **Públicas:** Home/vitrine, Detalhe do animal (botão "Tenho interesse" → modal
  de formulário).
- **Auth:** Registrar ONG, Login.
- **Admin:** Dashboard (alertas + resumo), Lista/edição de animais, Ficha do animal
  (abas: dados, vacinas, medicações, prontuário), Solicitações recebidas.

Interface responsiva e com atenção a acessibilidade (público leigo), conforme
objetivos do doc.

## 8. Segurança
- Senha com hash (bcrypt/argon2).
- JWT com expiração.
- Dependency do FastAPI que injeta usuário + `org_id` e bloqueia acesso cruzado
  entre ONGs em toda rota admin.

## 9. Testes & qualidade
- **Backend (pytest):** serviços (motor de alertas, regras de status) e endpoints
  (auth, isolamento por ONG, CRUD). Banco de teste SQLite ou Postgres efêmero.
- **Frontend (Vitest + Testing Library):** componentes-chave (formulário de
  interesse, card da vitrine). Leve.
- **Lint/format:** Ruff (Python), ESLint + Prettier (TS).

## 10. Fases de implementação
Cada fase entrega algo utilizável.

1. **Fundação:** monorepo, docker-compose, Postgres, FastAPI "hello", migração
   inicial, React+Vite rodando.
2. **Auth & multi-tenant:** register/login/JWT, `organization`+`user`, dependency
   de escopo.
3. **Animais (admin):** CRUD + status.
4. **Saúde:** vacinas, medicações, prontuário.
5. **Motor de alertas + Dashboard.**
6. **Vitrine pública + formulário de interesse.**
7. **Solicitações (admin)** + polimento/UX/acessibilidade.
8. **Testes, README, seed de demonstração.**
