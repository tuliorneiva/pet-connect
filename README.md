# PetConnecta

Plataforma web para gestão de abrigos de animais e vitrine de adoção responsável.

- **Área pública:** vitrine de animais com filtros, detalhe do animal e formulário de
  interesse (adoção / lar temporário / apadrinhamento).
- **Área administrativa (ONG):** cadastro/login, CRUD de animais, saúde (vacinas,
  medicações, prontuário), dashboard com alertas automáticos e gestão de solicitações.

Stack: React + Vite + TypeScript · FastAPI + SQLAlchemy + Alembic · PostgreSQL · Docker.

## Rodando com Docker

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:8000 (docs em `/docs`)

> **Porta 5432 ocupada?** Se você já roda um PostgreSQL nativo na 5432, crie um
> `docker-compose.override.yml` (não versionado) publicando o banco em outra porta:
> ```yaml
> services:
>   db:
>     ports: !override
>       - "5433:5432"
> ```

## Dados de demonstração (seed)

Popular o banco com uma ONG, animais (com fotos), alertas e uma solicitação:

```bash
cd apps/api && . .venv/bin/activate
DATABASE_URL=postgresql+psycopg2://petconnect:petconnect@localhost:5433/petconnect \
  python -m app.seed
```

Login da ONG demo: **demo@petconnecta.org** / **demo123**

## Backend (dev local)

```bash
cd apps/api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest            # 25 testes
ruff check app/ tests/
```

## Frontend (dev local)

```bash
cd apps/web
npm install
npm test          # 13 testes (vitest)
npm run build
```

Design e planos em `docs/superpowers/`.
