# PetConnect — Fundação & Auth/Multi-tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the PetConnect monorepo (FastAPI + React + Postgres via docker-compose) and implement organization self-registration, login (JWT), and an authenticated `/me` endpoint scoped by ONG.

**Architecture:** Two-folder monorepo (`apps/api`, `apps/web`) orchestrated by `docker-compose`. FastAPI serves a REST API under `/api`, backed by PostgreSQL through SQLAlchemy 2.0; Alembic manages migrations. Auth uses password hashing (bcrypt) + JWT carrying the user id (`sub`) and `org_id`. The React (Vite + TS) SPA is scaffolded and talks to the API.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, pydantic-settings, PyJWT, passlib[bcrypt], pytest, httpx. Node 20, React 18, Vite, TypeScript, Vitest.

## Global Constraints

- Python version floor: 3.12.
- Node version floor: 20.
- All API routes are prefixed with `/api`. Auth routes under `/api/auth`.
- JWT payload MUST contain `sub` (user id as string) and `org_id` (int).
- Every admin/authenticated data query MUST be scoped by the authenticated user's `org_id` (multi-tenant isolation). This plan establishes the mechanism; later plans use it.
- SQLAlchemy 2.0 declarative style (`Mapped` / `mapped_column`).
- Integer primary keys throughout.
- Backend tests run against in-memory SQLite (dependency override), not Postgres.
- Table names are singular: `organization`, `user`.

---

## File Structure

**Phase 1 (Foundation)**
- Create: `apps/api/requirements.txt` — Python deps.
- Create: `apps/api/pyproject.toml` — ruff + pytest config (no build backend).
- Create: `apps/api/app/__init__.py`, `apps/api/app/main.py` — FastAPI app + health.
- Create: `apps/api/app/core/config.py` — settings (env-driven).
- Create: `apps/api/app/db/base.py`, `apps/api/app/db/session.py` — ORM base + session/`get_db`.
- Create: `apps/api/app/models/__init__.py` — imports models so metadata is populated.
- Create: `apps/api/tests/conftest.py`, `apps/api/tests/test_health.py`.
- Create: `apps/api/alembic.ini`, `apps/api/alembic/env.py`, `apps/api/alembic/script.py.mako`, `apps/api/alembic/versions/` — migrations.
- Create: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`.
- Create: `apps/web/` — Vite React TS scaffold + `src/lib/api.ts` + a smoke test.

**Phase 2 (Auth & multi-tenant)**
- Create: `apps/api/app/models/organization.py`, `apps/api/app/models/user.py`.
- Create: `apps/api/app/core/security.py` — hashing + JWT.
- Create: `apps/api/app/core/deps.py` — `get_current_user`.
- Create: `apps/api/app/schemas/auth.py` — Pydantic request/response.
- Create: `apps/api/app/routers/auth.py` — register/login/me.
- Modify: `apps/api/app/main.py` — include auth router.
- Create: `apps/api/tests/test_auth.py`.
- Create: `apps/api/alembic/versions/0001_organization_user.py` (generated).

---

# PHASE 1 — FOUNDATION

### Task 1: Backend project skeleton + health endpoint

**Files:**
- Create: `apps/api/requirements.txt`
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/app/__init__.py`
- Create: `apps/api/app/core/__init__.py`
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/app/main.py`
- Test: `apps/api/tests/__init__.py`, `apps/api/tests/conftest.py`, `apps/api/tests/test_health.py`

**Interfaces:**
- Produces: FastAPI `app` in `app.main`; `GET /api/health` → `{"status": "ok"}`. `settings` object in `app.core.config` with `database_url`, `secret_key`, `access_token_expire_minutes`, `jwt_algorithm`.

- [ ] **Step 1: Create dependency and tooling files**

`apps/api/requirements.txt`:
```
fastapi==0.115.*
uvicorn[standard]==0.32.*
sqlalchemy==2.0.*
alembic==1.14.*
pydantic-settings==2.6.*
pydantic[email]==2.9.*
PyJWT==2.10.*
passlib[bcrypt]==1.7.*
psycopg2-binary==2.9.*
python-multipart==0.0.*
pytest==8.3.*
httpx==0.27.*
ruff==0.7.*
```

`apps/api/pyproject.toml`:
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

- [ ] **Step 2: Create config and app**

`apps/api/app/__init__.py`: (empty file)

`apps/api/app/core/__init__.py`: (empty file)

`apps/api/app/core/config.py`:
```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://petconnect:petconnect@localhost:5432/petconnect"
    )
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24
    jwt_algorithm: str = "HS256"


settings = Settings()
```

`apps/api/app/main.py`:
```python
from fastapi import FastAPI

app = FastAPI(title="PetConnect API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 3: Write the failing test**

`apps/api/tests/__init__.py`: (empty file)

`apps/api/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
```

`apps/api/tests/test_health.py`:
```python
def test_health_ok(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 4: Install deps and run the test to verify it passes**

Run (from `apps/api`, inside a fresh venv):
```bash
python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
pytest tests/test_health.py -v
```
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold FastAPI app with health endpoint"
```

---

### Task 2: Database layer (Base, session, get_db)

**Files:**
- Create: `apps/api/app/db/__init__.py`
- Create: `apps/api/app/db/base.py`
- Create: `apps/api/app/db/session.py`
- Create: `apps/api/app/models/__init__.py`
- Modify: `apps/api/tests/conftest.py`
- Test: `apps/api/tests/test_db.py`

**Interfaces:**
- Produces: `Base` (DeclarativeBase) in `app.db.base`; `engine`, `SessionLocal`, `get_db()` generator in `app.db.session`. `app.models` package (empty of models for now) whose import registers all models on `Base.metadata`.
- Consumes: `settings.database_url` from Task 1.

- [ ] **Step 1: Create the DB modules**

`apps/api/app/db/__init__.py`: (empty file)

`apps/api/app/db/base.py`:
```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

`apps/api/app/db/session.py`:
```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

`apps/api/app/models/__init__.py`:
```python
# Importing this package registers all ORM models on Base.metadata.
# Models are added in later tasks, e.g.:
# from app.models.organization import Organization  # noqa: F401
```

- [ ] **Step 2: Wire a SQLite test database into conftest**

Replace `apps/api/tests/conftest.py` with:
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers models on metadata)
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session) -> TestClient:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Write the failing test**

`apps/api/tests/test_db.py`:
```python
from sqlalchemy import text


def test_db_session_executes(db_session):
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/ -v`
Expected: PASS (test_health + test_db).

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): add SQLAlchemy base, session, and test db fixtures"
```

---

### Task 3: Alembic migrations setup

**Files:**
- Create: `apps/api/alembic.ini`
- Create: `apps/api/alembic/env.py`
- Create: `apps/api/alembic/script.py.mako`
- Create: `apps/api/alembic/versions/.gitkeep`

**Interfaces:**
- Produces: A working `alembic` config whose `target_metadata` is `Base.metadata` and whose URL comes from `settings.database_url`. Enables `alembic revision --autogenerate` and `alembic upgrade head`.
- Consumes: `Base` (Task 2), `settings` (Task 1), `app.models` (Task 2).

- [ ] **Step 1: Create alembic.ini**

`apps/api/alembic.ini`:
```ini
[alembic]
script_location = alembic
prepend_sys_path = .

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 2: Create env.py wired to settings + metadata**

`apps/api/alembic/env.py`:
```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

import app.models  # noqa: F401  (registers models on metadata)
from app.core.config import settings
from app.db.base import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Create the migration template**

`apps/api/alembic/script.py.mako`:
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

`apps/api/alembic/versions/.gitkeep`: (empty file)

- [ ] **Step 4: Verify alembic loads (no tables yet, so nothing to generate)**

Run (from `apps/api`, with Postgres NOT required for `--sql` offline check):
```bash
alembic history
```
Expected: runs without error and prints an empty history (no revisions yet).

- [ ] **Step 5: Commit**

```bash
git add apps/api/alembic apps/api/alembic.ini
git commit -m "chore(api): set up Alembic migrations"
```

---

### Task 4: Docker Compose + env + repo docs

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: `docker compose up` starts `db` (Postgres 16), `api` (FastAPI on :8000, runs `alembic upgrade head` on boot), and later `web`. API reads `DATABASE_URL` and `SECRET_KEY` from environment.
- Consumes: `apps/api` app + alembic (Tasks 1–3).

- [ ] **Step 1: Create the API Dockerfile**

`apps/api/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
```

- [ ] **Step 2: Create docker-compose.yml (api + db; web added in Task 5)**

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: petconnect
      POSTGRES_PASSWORD: petconnect
      POSTGRES_DB: petconnect
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U petconnect"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql+psycopg2://petconnect:petconnect@db:5432/petconnect
      SECRET_KEY: dev-secret-change-me
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./apps/api:/app

volumes:
  pgdata:
```

- [ ] **Step 3: Create .env.example, .gitignore, README**

`.env.example`:
```
# Backend (apps/api)
DATABASE_URL=postgresql+psycopg2://petconnect:petconnect@localhost:5432/petconnect
SECRET_KEY=dev-secret-change-me
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

`.gitignore`:
```
# Python
__pycache__/
*.pyc
.venv/
.pytest_cache/
.ruff_cache/

# Node
node_modules/
dist/
apps/web/.vite/

# Env
.env

# OS
.DS_Store
```

`README.md`:
```markdown
# PetConnect (PetConecta)

Plataforma web para gestão de abrigos de animais e vitrine de adoção.

## Rodando com Docker

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000 (docs em `/docs`)
- Web: http://localhost:5173

## Backend (dev local)

```bash
cd apps/api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest
```

Ver design em `docs/superpowers/specs/`.
```

- [ ] **Step 4: Verify the API container builds and serves health**

Run (from repo root):
```bash
docker compose up --build -d db api
sleep 5 && curl -s http://localhost:8000/api/health
```
Expected: `{"status":"ok"}`. Then `docker compose down`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example .gitignore README.md apps/api/Dockerfile
git commit -m "chore: add docker-compose, env example, and README"
```

---

### Task 5: Frontend scaffold (Vite React TS) + api client

**Files:**
- Create: `apps/web/` (Vite scaffold: `package.json`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`)
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/App.test.tsx`
- Create: `apps/web/Dockerfile`
- Modify: `docker-compose.yml` (add `web` service)

**Interfaces:**
- Produces: Running SPA on :5173; `apiFetch(path, init)` helper in `src/lib/api.ts` that prefixes the API base URL and sets JSON headers.
- Consumes: `GET /api/health` (Task 1) for the smoke display.

- [ ] **Step 1: Scaffold the Vite app**

Run (from repo root):
```bash
npm create vite@latest apps/web -- --template react-ts
cd apps/web && npm install && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure Vitest**

Replace `apps/web/vite.config.ts`:
```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

`apps/web/src/setupTests.ts`:
```typescript
import "@testing-library/jest-dom";
```

Add to `apps/web/package.json` scripts (keep existing `dev`, `build`, `preview`):
```json
"test": "vitest run"
```

- [ ] **Step 3: Create the api client**

`apps/web/src/lib/api.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) {
    throw new Error(`Request failed: ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}
```

- [ ] **Step 4: Write the failing test**

Replace `apps/web/src/App.tsx`:
```typescript
export default function App() {
  return (
    <main>
      <h1>PetConnect</h1>
      <p>Plataforma de gestão de abrigos e adoção.</p>
    </main>
  );
}
```

`apps/web/src/App.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the PetConnect heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /petconnect/i })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run (from `apps/web`): `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Add the web service to docker-compose and a Dockerfile**

`apps/web/Dockerfile`:
```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Add to `docker-compose.yml` under `services:` (after `api`):
```yaml
  web:
    build: ./apps/web
    environment:
      VITE_API_BASE: http://localhost:8000
    ports:
      - "5173:5173"
    depends_on:
      - api
    volumes:
      - ./apps/web:/app
      - /app/node_modules
```

- [ ] **Step 7: Commit**

```bash
git add apps/web docker-compose.yml
git commit -m "feat(web): scaffold React+Vite+TS app with api client and smoke test"
```

---

# PHASE 2 — AUTH & MULTI-TENANT

### Task 6: Organization & User models + initial migration

**Files:**
- Create: `apps/api/app/models/organization.py`
- Create: `apps/api/app/models/user.py`
- Modify: `apps/api/app/models/__init__.py`
- Create: `apps/api/alembic/versions/0001_organization_user.py`
- Test: `apps/api/tests/test_models.py`

**Interfaces:**
- Produces: `Organization(id, name, slug, city, created_at)` and `User(id, org_id, name, email, password_hash, created_at)` ORM models importable from `app.models`.
- Consumes: `Base` (Task 2).

- [ ] **Step 1: Create the models**

`apps/api/app/models/organization.py`:
```python
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

`apps/api/app/models/user.py`:
```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 2: Register models in the package**

Replace `apps/api/app/models/__init__.py`:
```python
from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
```

- [ ] **Step 3: Write the failing test**

`apps/api/tests/test_models.py`:
```python
from app.models import Organization, User


def test_can_persist_org_and_user(db_session):
    org = Organization(name="Abrigo Feliz", slug="abrigo-feliz", city="João Pessoa")
    db_session.add(org)
    db_session.flush()
    user = User(
        org_id=org.id,
        name="Ana",
        email="ana@abrigo.org",
        password_hash="x",
    )
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.org_id == org.id
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_models.py -v`
Expected: PASS.

- [ ] **Step 5: Generate the migration against Postgres**

Run (from `apps/api`, with Postgres running via `docker compose up -d db`):
```bash
DATABASE_URL=postgresql+psycopg2://petconnect:petconnect@localhost:5432/petconnect \
  alembic revision --autogenerate -m "organization and user"
```
Rename the generated file in `alembic/versions/` to start with `0001_` and confirm its `upgrade()` creates `organization` and `user` tables with the columns above. Then apply:
```bash
DATABASE_URL=postgresql+psycopg2://petconnect:petconnect@localhost:5432/petconnect alembic upgrade head
```
Expected: both tables created; `alembic upgrade head` exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/models apps/api/alembic/versions
git commit -m "feat(api): add Organization and User models with initial migration"
```

---

### Task 7: Password hashing utilities

**Files:**
- Create: `apps/api/app/core/security.py`
- Test: `apps/api/tests/test_security_password.py`

**Interfaces:**
- Produces: `hash_password(password: str) -> str` and `verify_password(plain: str, hashed: str) -> bool` in `app.core.security`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_security_password.py`:
```python
from app.core.security import hash_password, verify_password


def test_hash_is_not_plaintext_and_verifies():
    hashed = hash_password("s3cret!")
    assert hashed != "s3cret!"
    assert verify_password("s3cret!", hashed) is True
    assert verify_password("wrong", hashed) is False
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/test_security_password.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.security'`.

- [ ] **Step 3: Implement the hashing helpers**

`apps/api/app/core/security.py`:
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_security_password.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/security.py apps/api/tests/test_security_password.py
git commit -m "feat(api): add password hashing utilities"
```

---

### Task 8: JWT create/decode utilities

**Files:**
- Modify: `apps/api/app/core/security.py`
- Test: `apps/api/tests/test_security_jwt.py`

**Interfaces:**
- Produces: `create_access_token(subject: str, org_id: int) -> str` and `decode_access_token(token: str) -> dict` in `app.core.security`. Token payload contains `sub` (str), `org_id` (int), `exp`.
- Consumes: `settings.secret_key`, `settings.jwt_algorithm`, `settings.access_token_expire_minutes` (Task 1).

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_security_jwt.py`:
```python
from app.core.security import create_access_token, decode_access_token


def test_token_roundtrip_carries_sub_and_org():
    token = create_access_token(subject="42", org_id=7)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["org_id"] == 7
    assert "exp" in payload
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/test_security_jwt.py -v`
Expected: FAIL with `ImportError: cannot import name 'create_access_token'`.

- [ ] **Step 3: Add JWT helpers to security.py**

Append to `apps/api/app/core/security.py`:
```python
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def create_access_token(subject: str, org_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "org_id": org_id, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token, settings.secret_key, algorithms=[settings.jwt_algorithm]
    )
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_security_jwt.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/security.py apps/api/tests/test_security_jwt.py
git commit -m "feat(api): add JWT create/decode utilities"
```

---

### Task 9: Auth schemas

**Files:**
- Create: `apps/api/app/schemas/__init__.py`
- Create: `apps/api/app/schemas/auth.py`

**Interfaces:**
- Produces: `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserResponse` in `app.schemas.auth`.

- [ ] **Step 1: Create the schemas**

`apps/api/app/schemas/__init__.py`: (empty file)

`apps/api/app/schemas/auth.py`:
```python
from pydantic import BaseModel, ConfigDict, EmailStr


class RegisterRequest(BaseModel):
    org_name: str
    city: str | None = None
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    org_id: int
```

- [ ] **Step 2: Verify the module imports**

Run: `python -c "from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse; print('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/schemas
git commit -m "feat(api): add auth request/response schemas"
```

---

### Task 10: Register endpoint (creates ONG + first admin)

**Files:**
- Create: `apps/api/app/routers/__init__.py`
- Create: `apps/api/app/routers/auth.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/test_auth.py`

**Interfaces:**
- Produces: `POST /api/auth/register` → 201 `{access_token, token_type}`; creates one `Organization` (unique slug from `org_name`) and one `User` (bcrypt-hashed password). Rejects duplicate email with 400. `router` object exported from `app.routers.auth`.
- Consumes: `hash_password`, `create_access_token` (Tasks 7–8); `Organization`, `User` (Task 6); auth schemas (Task 9); `get_db` (Task 2).

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_auth.py`:
```python
def _register_payload(**over):
    base = {
        "org_name": "Abrigo Feliz",
        "city": "João Pessoa",
        "name": "Ana",
        "email": "ana@abrigo.org",
        "password": "s3cret!",
    }
    base.update(over)
    return base


def test_register_returns_token(client):
    resp = client.post("/api/auth/register", json=_register_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_register_duplicate_email_rejected(client):
    client.post("/api/auth/register", json=_register_payload())
    resp = client.post("/api/auth/register", json=_register_payload(org_name="Outro"))
    assert resp.status_code == 400
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/test_auth.py -v`
Expected: FAIL (404, route not found).

- [ ] **Step 3: Implement the router (register only for now)**

`apps/api/app/routers/__init__.py`: (empty file)

`apps/api/app/routers/auth.py`:
```python
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models import Organization, User
from app.schemas.auth import RegisterRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    return re.sub(r"[\s_-]+", "-", value)


def _unique_slug(db: Session, org_name: str) -> str:
    base = slugify(org_name) or "ong"
    slug = base
    i = 1
    while db.scalar(select(Organization).where(Organization.slug == slug)):
        i += 1
        slug = f"{base}-{i}"
    return slug


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    org = Organization(
        name=payload.org_name,
        slug=_unique_slug(db, payload.org_name),
        city=payload.city,
    )
    db.add(org)
    db.flush()

    user = User(
        org_id=org.id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()

    token = create_access_token(subject=str(user.id), org_id=org.id)
    return TokenResponse(access_token=token)
```

- [ ] **Step 4: Include the router in the app**

Replace `apps/api/app/main.py`:
```python
from fastapi import FastAPI

from app.routers import auth

app = FastAPI(title="PetConnect API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pytest tests/test_auth.py -v`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/routers apps/api/app/main.py apps/api/tests/test_auth.py
git commit -m "feat(api): add ONG self-registration endpoint"
```

---

### Task 11: Login endpoint

**Files:**
- Modify: `apps/api/app/routers/auth.py`
- Modify: `apps/api/tests/test_auth.py`

**Interfaces:**
- Produces: `POST /api/auth/login` → 200 `{access_token, token_type}` on valid credentials; 401 on invalid. Token carries `sub` = user id, `org_id` = user's org.
- Consumes: `verify_password`, `create_access_token` (Tasks 7–8); `LoginRequest` (Task 9).

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/test_auth.py`:
```python
def test_login_success(client):
    client.post("/api/auth/register", json=_register_payload())
    resp = client.post(
        "/api/auth/login",
        json={"email": "ana@abrigo.org", "password": "s3cret!"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_rejected(client):
    client.post("/api/auth/register", json=_register_payload())
    resp = client.post(
        "/api/auth/login",
        json={"email": "ana@abrigo.org", "password": "nope"},
    )
    assert resp.status_code == 401
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/test_auth.py -k login -v`
Expected: FAIL (404).

- [ ] **Step 3: Add the login route**

Add imports at the top of `apps/api/app/routers/auth.py` (extend the existing import lines):
```python
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
```

Append the login handler to `apps/api/app/routers/auth.py`:
```python
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(subject=str(user.id), org_id=user.org_id)
    return TokenResponse(access_token=token)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_auth.py -v`
Expected: PASS (all auth tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/routers/auth.py apps/api/tests/test_auth.py
git commit -m "feat(api): add login endpoint"
```

---

### Task 12: `get_current_user` dependency + `/me` + isolation test

**Files:**
- Create: `apps/api/app/core/deps.py`
- Modify: `apps/api/app/routers/auth.py`
- Modify: `apps/api/tests/test_auth.py`

**Interfaces:**
- Produces: `get_current_user(token, db) -> User` dependency in `app.core.deps` that decodes the JWT, loads the `User`, and 401s on invalid/missing token or unknown user. `GET /api/auth/me` → 200 `UserResponse` for the authenticated user. This dependency is the multi-tenant anchor: later admin routes read `current_user.org_id` to scope queries.
- Consumes: `decode_access_token` (Task 8); `User` (Task 6); `get_db` (Task 2); `UserResponse` (Task 9).

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/test_auth.py`:
```python
def _token(client, **over):
    client.post("/api/auth/register", json=_register_payload(**over))
    resp = client.post(
        "/api/auth/login",
        json={"email": over.get("email", "ana@abrigo.org"), "password": "s3cret!"},
    )
    return resp.json()["access_token"]


def test_me_returns_current_user_and_org(client):
    token = _token(client)
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "ana@abrigo.org"
    assert body["org_id"] == 1


def test_two_orgs_get_distinct_org_ids(client):
    token_a = _token(client)
    token_b = _token(client, org_name="Abrigo B", email="b@abrigo.org")
    org_a = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_a}"}
    ).json()["org_id"]
    org_b = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_b}"}
    ).json()["org_id"]
    assert org_a != org_b


def test_me_without_token_is_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/test_auth.py -k "me or distinct" -v`
Expected: FAIL (404 on `/me`).

- [ ] **Step 3: Implement the dependency**

`apps/api/app/core/deps.py`:
```python
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=401,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise credentials_exc

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exc

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exc
    return user
```

- [ ] **Step 4: Add the `/me` route**

Add import at the top of `apps/api/app/routers/auth.py`:
```python
from app.core.deps import get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
```

Append the handler to `apps/api/app/routers/auth.py`:
```python
@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
```

- [ ] **Step 5: Run the full test suite**

Run: `pytest -v`
Expected: PASS (health, db, models, security, and all auth tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/core/deps.py apps/api/app/routers/auth.py apps/api/tests/test_auth.py
git commit -m "feat(api): add get_current_user dependency and /me endpoint"
```

---

## Definition of Done (Phases 1–2)

- `docker compose up --build` starts db + api + web; `GET /api/health` returns ok.
- `pytest` passes in `apps/api`; `npm test` passes in `apps/web`.
- A new ONG can self-register, log in, and fetch `/api/auth/me`; two ONGs receive distinct `org_id`s. The `get_current_user` dependency is in place as the anchor for org-scoped admin routes in the next plan (Animals).
