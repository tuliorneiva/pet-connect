# Public Redesign + Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize PetConnect's public UI with Tailwind v4 + shadcn/ui, add a marketing landing page at `/lp`, and add a public ONG profile page `/ongs/:slug` backed by new API fields/endpoints.

**Architecture:** Backend (FastAPI + SQLAlchemy + Alembic) gains new optional `Organization` columns, enriched `PublicAnimalResponse` (org name/city/slug), a public organization endpoint with computed stats, and an `org` filter on the public animals list. Frontend (React 19 + Vite 8 + React Router 7) adopts Tailwind v4 + a small hand-authored shadcn/ui component set; public + auth pages are re-implemented with these primitives while the admin screens keep their existing CSS-module components untouched.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, pytest · React 19, Vite 8, TypeScript, React Router 7, Tailwind CSS v4, shadcn/ui primitives, Vitest + Testing Library.

## Global Constraints

- **Light mode only.** No dark-mode variants, no `.dark` block. (Project design memory.)
- **Accent color teal `#0E7490`** (hover `#0C607A`); tokens mirror `apps/web/src/styles/tokens.css`.
- **UI copy in pt-BR.**
- **Animal domain values (as stored):** species `cão` / `gato` / `outro`; size `P` / `M` / `G`; sex `macho` / `fêmea`; status `disponível` / `em_processo` / `adotado` / `indisponível`. Only `disponível` animals appear in public endpoints.
- **Do NOT modify admin pages** (`src/pages/admin/*`), the admin layout, or the existing `src/components/ui/*.tsx` CSS-module components. They stay as-is.
- **Python:** run commands from `apps/api` with the venv (`apps/api/.venv`) active. **Web:** run commands from `apps/web`.
- **Commit after every task.** Conventional Commit messages, scoped `api`/`web`.

---

## File Structure

**Backend (`apps/api`):**
- `app/models/organization.py` — add profile columns (modify)
- `app/models/animal.py` — add `organization` relationship (modify)
- `app/schemas/animal.py` — enrich `PublicAnimalResponse` (modify)
- `app/schemas/organization.py` — new `PublicOrganizationResponse` (create)
- `app/routers/public.py` — org endpoint + `org` filter (modify)
- `alembic/versions/0003_organization_public_profile.py` — migration (create)
- `app/seed.py` — populate new fields (modify)
- `tests/test_public_org.py` — new endpoint tests (create)
- `tests/test_animals.py` — assert org fields on public animal (modify)

**Frontend (`apps/web`):**
- `package.json`, `vite.config.ts`, `tsconfig.app.json`, `components.json` — tooling (modify/create)
- `src/styles/tailwind.css` — Tailwind entry + shadcn theme tokens (create)
- `src/main.tsx` — import Tailwind css (modify)
- `src/lib/utils.ts` — `cn` helper (create)
- `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `skeleton.tsx` — shadcn primitives (create; lowercase names, coexist with existing `Button.tsx` etc.)
- `src/lib/types.ts`, `src/lib/publicApi.ts` — org types + API (modify)
- `src/layouts/PublicLayout.tsx` — restyle (modify)
- `src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `LoginPage.test.tsx` — restyle (modify)
- `src/pages/public/HomePage.tsx`, `AnimalPublicPage.tsx` — restyle (modify)
- `src/pages/public/OrgPage.tsx` — new ONG profile (create)
- `src/pages/marketing/LandingPage.tsx` — new `/lp` (create)
- `src/App.tsx` — routes (modify)

---

## Task 1: Organization profile columns + migration

**Files:**
- Modify: `apps/api/app/models/organization.py`
- Create: `apps/api/alembic/versions/0003_organization_public_profile.py`

**Interfaces:**
- Produces: `Organization` columns `description: str|None`, `email: str|None`, `phone: str|None`, `website: str|None`, `address: str|None`, `founded_year: int|None`, `verified: bool` (default `False`), `logo_url: str|None`.

- [ ] **Step 1: Add columns to the model**

Replace the body of `apps/api/app/models/organization.py` with:

```python
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    founded_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 2: Write the migration**

Create `apps/api/alembic/versions/0003_organization_public_profile.py`:

```python
"""organization public profile fields

Revision ID: 0003_organization_public_profile
Revises: 0002_animals_health
Create Date: 2026-07-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_organization_public_profile"
down_revision = "0002_animals_health"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organization", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("organization", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("organization", sa.Column("phone", sa.String(length=40), nullable=True))
    op.add_column("organization", sa.Column("website", sa.String(length=255), nullable=True))
    op.add_column("organization", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("organization", sa.Column("founded_year", sa.Integer(), nullable=True))
    op.add_column(
        "organization",
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="0"),
    )
    op.add_column("organization", sa.Column("logo_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    for col in ("logo_url", "verified", "founded_year", "address", "website", "phone", "email", "description"):
        op.drop_column("organization", col)
```

- [ ] **Step 3: Verify the model imports and metadata build**

Run (from `apps/api`, venv active):
```bash
python -c "import app.models; from app.models import Organization; print(sorted(Organization.__table__.columns.keys()))"
```
Expected: a list including `address, description, email, founded_year, logo_url, phone, verified, website`.

- [ ] **Step 4: Run the existing suite to confirm no regression**

Run: `pytest -q`
Expected: all tests pass (tests build the schema from metadata, so new columns are picked up automatically).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/models/organization.py apps/api/alembic/versions/0003_organization_public_profile.py
git commit -m "feat(api): add public profile columns to organization"
```

---

## Task 2: Enrich PublicAnimalResponse with organization data

**Files:**
- Modify: `apps/api/app/models/animal.py`
- Modify: `apps/api/app/schemas/animal.py`
- Modify: `apps/api/tests/test_animals.py`

**Interfaces:**
- Consumes: `Organization` (Task 1).
- Produces: `Animal.organization` relationship; `PublicAnimalResponse` now includes `org_name: str`, `org_city: str | None`, `org_slug: str` (computed from the related organization).

- [ ] **Step 1: Add the relationship to the Animal model**

In `apps/api/app/models/animal.py`, update imports and add the relationship. Change the import line:
```python
from sqlalchemy.orm import Mapped, mapped_column, relationship
```
Add a `TYPE_CHECKING` import block after the existing imports:
```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.organization import Organization
```
Add this attribute at the end of the `Animal` class body (after `created_at`):
```python
    organization: Mapped["Organization"] = relationship("Organization", lazy="joined")
```

- [ ] **Step 2: Write the failing test**

In `apps/api/tests/test_animals.py`, append:
```python
def test_public_animal_includes_org_fields(client):
    token = _register(client, org_name="Abrigo Alfa")
    a = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()

    detail = client.get(f"/api/public/animals/{a['id']}").json()
    assert detail["org_name"] == "Abrigo Alfa"
    assert detail["org_city"] == "João Pessoa"
    assert detail["org_slug"]  # non-empty slug

    listing = client.get("/api/public/animals").json()
    assert listing[0]["org_name"] == "Abrigo Alfa"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pytest tests/test_animals.py::test_public_animal_includes_org_fields -v`
Expected: FAIL — response has no `org_name` key (KeyError / assertion error).

- [ ] **Step 4: Add org fields to the schema via AliasPath**

Read the nested organization attributes through Pydantic's `AliasPath` (works with `from_attributes=True` — it resolves `animal.organization.name` etc.). In `apps/api/app/schemas/animal.py`, update the pydantic import line to:
```python
from pydantic import AliasPath, BaseModel, ConfigDict, Field
```
and replace the entire `PublicAnimalResponse` class with:
```python
class PublicAnimalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    species: str
    breed: str | None
    sex: str | None
    size: str | None
    birth_estimate: str | None
    description: str | None
    photo_url: str | None
    org_id: int
    org_name: str = Field(validation_alias=AliasPath("organization", "name"))
    org_city: str | None = Field(default=None, validation_alias=AliasPath("organization", "city"))
    org_slug: str = Field(validation_alias=AliasPath("organization", "slug"))
```

Note: `AliasPath` reads from the input object's attributes, so the `Animal.organization` relationship (Task 2 Step 1) must be present. The other schemas in this file (`AnimalResponse`, etc.) are unchanged; keep their existing `from pydantic import ...` symbols available by merging — the single import line above must include every symbol the file already used (`BaseModel`, `ConfigDict`) plus the new `AliasPath`, `Field`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pytest tests/test_animals.py::test_public_animal_includes_org_fields -v`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `pytest -q`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/models/animal.py apps/api/app/schemas/animal.py apps/api/tests/test_animals.py
git commit -m "feat(api): include organization name/city/slug in public animal response"
```

---

## Task 3: Public organization endpoint + org filter on animals

**Files:**
- Create: `apps/api/app/schemas/organization.py`
- Modify: `apps/api/app/routers/public.py`
- Create: `apps/api/tests/test_public_org.py`

**Interfaces:**
- Consumes: `Organization` (Task 1), `PublicAnimalResponse` (Task 2).
- Produces:
  - `GET /api/public/organizations/{slug}` → `PublicOrganizationResponse` (fields: `id, name, slug, city, description, email, phone, website, address, founded_year, verified, logo_url, created_at, available_count, adopted_count`). 404 if slug not found.
  - `GET /api/public/animals?org={slug}` filters available animals by organization slug.

- [ ] **Step 1: Create the schema**

Create `apps/api/app/schemas/organization.py`:
```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PublicOrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    city: str | None
    description: str | None
    email: str | None
    phone: str | None
    website: str | None
    address: str | None
    founded_year: int | None
    verified: bool
    logo_url: str | None
    created_at: datetime
    available_count: int
    adopted_count: int
```

- [ ] **Step 2: Write the failing tests**

Create `apps/api/tests/test_public_org.py`:
```python
def _register(client, email="ong@abrigo.org", org_name="Abrigo Beta"):
    resp = client.post(
        "/api/auth/register",
        json={"org_name": org_name, "city": "Recife", "name": "Bia", "email": email, "password": "s3cret!"},
    )
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _slug_of(client, token):
    # the first (only) public animal reveals the org slug
    a = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()
    return client.get(f"/api/public/animals/{a['id']}").json()["org_slug"]


def test_public_org_returns_profile_and_counts(client):
    token = _register(client)
    slug = _slug_of(client, token)
    # add an adopted animal to exercise adopted_count
    b = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Bob", "species": "cão"}).json()
    client.patch(f"/api/admin/animals/{b['id']}", headers=_auth(token), json={"status": "adotado"})

    resp = client.get(f"/api/public/organizations/{slug}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Abrigo Beta"
    assert body["city"] == "Recife"
    assert body["verified"] is False
    assert body["available_count"] == 1
    assert body["adopted_count"] == 1


def test_public_org_404_for_unknown_slug(client):
    assert client.get("/api/public/organizations/nao-existe").status_code == 404


def test_public_animals_filter_by_org(client):
    token_a = _register(client, email="a@x.org", org_name="Abrigo A")
    token_b = _register(client, email="b@x.org", org_name="Abrigo B")
    client.post("/api/admin/animals", headers=_auth(token_a), json={"name": "Aa", "species": "cão"})
    client.post("/api/admin/animals", headers=_auth(token_b), json={"name": "Bb", "species": "gato"})
    slug_a = _slug_of(client, token_a)  # creates a second animal for A named Rex

    result = client.get(f"/api/public/animals?org={slug_a}").json()
    names = {x["name"] for x in result}
    assert names == {"Aa", "Rex"}
    assert all(x["org_slug"] == slug_a for x in result)
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pytest tests/test_public_org.py -v`
Expected: FAIL — endpoint returns 404/route missing; `org` filter ignored.

- [ ] **Step 4: Implement the endpoint and filter**

In `apps/api/app/routers/public.py`, update imports:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Animal, Organization, SupportRequest
from app.schemas.animal import PublicAnimalResponse
from app.schemas.organization import PublicOrganizationResponse
from app.schemas.support_request import SupportRequestCreate, SupportRequestResponse
```
Add an `org` parameter to `list_public_animals` (after `city`):
```python
    org: str | None = None,
```
and inside, after the `city` filter block, add:
```python
    if org:
        stmt = stmt.join(Organization, Animal.org_id == Organization.id).where(
            Organization.slug == org
        )
```
(If `city` already joined `Organization`, joining again is harmless in SQLAlchemy when using the same target; to avoid a double-join error, guard by joining once — replace the two filter blocks with a single conditional join:)
```python
    if city or org:
        stmt = stmt.join(Organization, Animal.org_id == Organization.id)
        if city:
            stmt = stmt.where(Organization.city == city)
        if org:
            stmt = stmt.where(Organization.slug == org)
```
Remove the old standalone `if city:` join block so the join happens only once.

Add the new endpoint at the end of the file:
```python
@router.get("/organizations/{slug}", response_model=PublicOrganizationResponse)
def get_public_organization(slug: str, db: Session = Depends(get_db)) -> PublicOrganizationResponse:
    org = db.scalar(select(Organization).where(Organization.slug == slug))
    if org is None:
        raise HTTPException(status_code=404, detail="ONG não encontrada")

    available = db.scalar(
        select(func.count(Animal.id)).where(Animal.org_id == org.id, Animal.status == "disponível")
    )
    adopted = db.scalar(
        select(func.count(Animal.id)).where(Animal.org_id == org.id, Animal.status == "adotado")
    )
    return PublicOrganizationResponse.model_validate(
        org, update={"available_count": available or 0, "adopted_count": adopted or 0}
    )
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pytest tests/test_public_org.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full suite**

Run: `pytest -q`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/organization.py apps/api/app/routers/public.py apps/api/tests/test_public_org.py
git commit -m "feat(api): add public organization endpoint and org filter"
```

---

## Task 4: Populate new organization fields in the seed

**Files:**
- Modify: `apps/api/app/seed.py`

**Interfaces:**
- Consumes: `Organization` columns (Task 1).
- Produces: demo ONG with rich profile + at least one `adotado` animal (already present: "Bob").

- [ ] **Step 1: Enrich the Organization in the seed**

In `apps/api/app/seed.py`, replace the organization creation line:
```python
        org = Organization(name="Abrigo Amigo Fiel", slug="abrigo-amigo-fiel", city="João Pessoa")
```
with:
```python
        org = Organization(
            name="Abrigo Amigo Fiel",
            slug="abrigo-amigo-fiel",
            city="João Pessoa",
            description=(
                "O Abrigo Amigo Fiel resgata, cuida e encaminha para adoção cães e gatos "
                "em situação de abandono em João Pessoa e região. Todos os animais passam por "
                "avaliação veterinária, vacinação e castração antes de irem para um novo lar."
            ),
            email="contato@amigofiel.org",
            phone="(83) 99999-0000",
            website="amigofiel.org",
            address="Rua das Acácias, 240 — Bancários, João Pessoa/PB",
            founded_year=2019,
            verified=True,
        )
```

- [ ] **Step 2: Verify the seed script parses**

Run (from `apps/api`, venv active): `python -c "import app.seed"`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/api/app/seed.py
git commit -m "feat(api): enrich demo ONG profile in seed"
```

---

## Task 5: Tailwind v4 + shadcn/ui foundation

**Files:**
- Modify: `apps/web/package.json` (via npm install)
- Modify: `apps/web/vite.config.ts`, `apps/web/tsconfig.app.json`
- Create: `apps/web/components.json`, `apps/web/src/styles/tailwind.css`, `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `skeleton.tsx`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Produces (import via `@/` alias):
  - `cn(...classes)` from `@/lib/utils`
  - `Button` (props: standard button + `asChild?: boolean`, `variant?: "default"|"outline"|"ghost"|"secondary"`, `size?: "default"|"sm"|"lg"|"icon"`) from `@/components/ui/button`
  - `Card, CardHeader, CardTitle, CardContent, CardFooter` from `@/components/ui/card`
  - `Badge` (props: `variant?: "default"|"secondary"|"outline"`) from `@/components/ui/badge`
  - `Input` from `@/components/ui/input`
  - `Label` from `@/components/ui/label`
  - `Select` (native `<select>` styled; props = native select props) from `@/components/ui/select`
  - `Skeleton` from `@/components/ui/skeleton`

- [ ] **Step 1: Install dependencies**

Run (from `apps/web`):
```bash
npm install tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge @radix-ui/react-slot
```
Expected: installs succeed; `package.json` dependencies updated.

- [ ] **Step 2: Add the `@` path alias (tsconfig)**

In `apps/web/tsconfig.app.json`, inside `compilerOptions`, add:
```json
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
```

- [ ] **Step 3: Wire Tailwind plugin + alias in Vite**

Replace `apps/web/vite.config.ts` with:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
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

- [ ] **Step 4: Create the Tailwind entry + shadcn theme tokens**

Create `apps/web/src/styles/tailwind.css`:
```css
@import "tailwindcss";

:root {
  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  --primary: #0E7490;
  --primary-foreground: #FFFFFF;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #5B7280;
  --accent: #ECFEFF;
  --accent-foreground: #0E7490;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #0E7490;
  --radius: 0.625rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
}
```

- [ ] **Step 5: Import Tailwind first in main.tsx**

In `apps/web/src/main.tsx`, add as the **first** css import (before `tokens.css`):
```ts
import "./styles/tailwind.css";
```
Keep the existing `tokens.css` and `global.css` imports (admin still uses them).

- [ ] **Step 6: Create the `cn` helper**

Create `apps/web/src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Create `components.json`**

Create `apps/web/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/tailwind.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 8: Create the primitive components**

Create `apps/web/src/components/ui/button.tsx`:
```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#0C607A]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-slate-200",
        outline: "border border-input bg-card hover:bg-slate-50",
        ghost: "hover:bg-slate-100",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5",
        lg: "h-[52px] px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
```

Create `apps/web/src/components/ui/card.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-6", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-bold tracking-tight", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
```

Create `apps/web/src/components/ui/badge.tsx`:
```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-[#cffafe] bg-accent text-accent-foreground",
        secondary: "border-border bg-secondary text-muted-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

Create `apps/web/src/components/ui/input.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

Create `apps/web/src/components/ui/label.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-medium text-foreground", className)} {...props} />
  ),
);
Label.displayName = "Label";
```

Create `apps/web/src/components/ui/select.tsx` (styled native select — keeps label-based testing and avoids radix):
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full appearance-none rounded-md border border-input bg-card bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235B7280%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
```

Create `apps/web/src/components/ui/skeleton.tsx`:
```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} {...props} />;
}
```
(Add `import * as React from "react";` at the top of skeleton.tsx.)

- [ ] **Step 9: Typecheck + build to verify the toolchain**

Run (from `apps/web`): `npm run build`
Expected: `tsc -b` passes and Vite build succeeds (Tailwind compiles).

- [ ] **Step 10: Run existing tests (no regression)**

Run: `npm run test`
Expected: existing tests still pass.

- [ ] **Step 11: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/vite.config.ts apps/web/tsconfig.app.json apps/web/components.json apps/web/src/styles/tailwind.css apps/web/src/main.tsx apps/web/src/lib/utils.ts apps/web/src/components/ui/button.tsx apps/web/src/components/ui/card.tsx apps/web/src/components/ui/badge.tsx apps/web/src/components/ui/input.tsx apps/web/src/components/ui/label.tsx apps/web/src/components/ui/select.tsx apps/web/src/components/ui/skeleton.tsx
git commit -m "feat(web): add Tailwind v4 + shadcn/ui foundation"
```

---

## Task 6: Web types + public API for organizations

**Files:**
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/lib/publicApi.ts`

**Interfaces:**
- Consumes: backend endpoints (Task 2, 3).
- Produces:
  - `PublicAnimal` gains `org_name: string`, `org_city: string | null`, `org_slug: string`.
  - `PublicOrganization` type.
  - `publicApi.getOrganization(slug: string): Promise<PublicOrganization>`.
  - `VitrineFilters` gains `org?: string`; `listAnimals` forwards it.

- [ ] **Step 1: Extend types**

In `apps/web/src/lib/types.ts`, update the `PublicAnimal` type to add three fields after `org_id`:
```ts
  org_name: string;
  org_city: string | null;
  org_slug: string;
```
Append a new type:
```ts
export type PublicOrganization = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  founded_year: number | null;
  verified: boolean;
  logo_url: string | null;
  created_at: string;
  available_count: number;
  adopted_count: number;
};
```

- [ ] **Step 2: Extend the API client**

In `apps/web/src/lib/publicApi.ts`, update imports:
```ts
import type { PublicAnimal, PublicOrganization, SupportRequest, SupportRequestInput } from "./types";
```
Add `org` to `VitrineFilters`:
```ts
export type VitrineFilters = {
  species?: string;
  size?: string;
  sex?: string;
  city?: string;
  org?: string;
};
```
Add to the `publicApi` object:
```ts
  getOrganization: (slug: string) =>
    apiFetch<PublicOrganization>(`/api/public/organizations/${slug}`),
```
(`toQuery` already forwards any key in `VitrineFilters`, so `org` works with no further change.)

- [ ] **Step 3: Typecheck**

Run (from `apps/web`): `npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/types.ts apps/web/src/lib/publicApi.ts
git commit -m "feat(web): add public organization type and API client"
```

---

## Task 7: Restyle PublicLayout + auth pages

**Files:**
- Modify: `apps/web/src/layouts/PublicLayout.tsx`
- Modify: `apps/web/src/pages/auth/LoginPage.tsx`, `apps/web/src/pages/auth/RegisterPage.tsx`
- Modify: `apps/web/src/pages/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: shadcn primitives (Task 5).
- Produces: no new exports; same component names.

- [ ] **Step 1: Restyle PublicLayout**

Replace `apps/web/src/layouts/PublicLayout.tsx` with:
```tsx
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-6xl items-center gap-6 px-6" style={{ height: 68 }}>
          <Link to="/lp" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-[#0891B2] text-white">🐾</span>
            Pet<span className="text-primary">Connect</span>
          </Link>
          <nav className="ml-auto flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/">Animais</Link></Button>
            <Button asChild size="sm"><Link to="/login">Área da ONG</Link></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Restyle LoginPage (preserve labels "E-mail"/"Senha" and submit logic)**

Replace `apps/web/src/pages/auth/LoginPage.tsx` with:
```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
```
Note: `Label htmlFor` + `Input id` keeps `getByLabelText("E-mail")`/`("Senha")` working, and the error `role="alert"` keeps the error test working.

- [ ] **Step 3: Update the login test's label association**

The existing test uses `screen.getByLabelText("E-mail")` and `("Senha")` and `getByRole("button", { name: /entrar/i })` and `findByRole("alert")`. The new markup preserves all four. Run the test to confirm:

Run (from `apps/web`): `npm run test -- src/pages/auth/LoginPage.test.tsx`
Expected: PASS (2 tests). If a label query fails, ensure `htmlFor`/`id` match exactly.

- [ ] **Step 4: Restyle RegisterPage**

Open `apps/web/src/pages/auth/RegisterPage.tsx`, read its current fields and submit handler, and re-implement its markup with the same pattern as LoginPage (Card + Label/Input + Button), **preserving every existing field name, state variable, label text, and the `register(...)`/navigate call exactly**. Do not change behavior — only swap the CSS-module markup for the shadcn/Tailwind markup mirroring Step 2. Keep any existing `role="alert"` error element.

- [ ] **Step 5: Build + full web test run**

Run: `npm run build && npm run test`
Expected: build passes; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/layouts/PublicLayout.tsx apps/web/src/pages/auth/LoginPage.tsx apps/web/src/pages/auth/RegisterPage.tsx apps/web/src/pages/auth/LoginPage.test.tsx
git commit -m "feat(web): restyle public layout and auth pages with shadcn"
```

---

## Task 8: Restyle Home (animal listing)

**Files:**
- Modify: `apps/web/src/pages/public/HomePage.tsx`
- Create: `apps/web/src/components/AnimalCard.tsx`
- Create: `apps/web/src/pages/public/HomePage.test.tsx`

**Interfaces:**
- Consumes: `publicApi.listAnimals` (Task 6), shadcn primitives, `PublicAnimal` type.
- Produces: `AnimalCard` component (`export function AnimalCard({ animal }: { animal: PublicAnimal })`) reused by Home, Org page, and Landing.

- [ ] **Step 1: Create the shared AnimalCard**

Create `apps/web/src/components/AnimalCard.tsx`:
```tsx
import { Link } from "react-router-dom";
import type { PublicAnimal } from "../lib/types";
import { Badge } from "@/components/ui/badge";

const SPECIES_LABEL: Record<string, string> = { cão: "Cão", gato: "Gato", outro: "Outro" };
const SIZE_LABEL: Record<string, string> = { P: "Pequeno", M: "Médio", G: "Grande" };

export function AnimalCard({ animal }: { animal: PublicAnimal }) {
  return (
    <Link
      to={`/animais/${animal.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative aspect-square bg-slate-100">
        {animal.photo_url ? (
          <img src={animal.photo_url} alt={animal.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-6xl">🐾</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-lg font-bold">{animal.name}</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge>{SPECIES_LABEL[animal.species] ?? animal.species}</Badge>
          {animal.sex && <Badge variant="secondary">{animal.sex}</Badge>}
          {animal.size && <Badge variant="secondary">{SIZE_LABEL[animal.size] ?? animal.size}</Badge>}
        </div>
        <div className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
          📍 {animal.org_city ? `${animal.org_city} · ` : ""}{animal.org_name}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Write the failing Home test**

Create `apps/web/src/pages/public/HomePage.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi, beforeEach } from "vitest";
import { HomePage } from "./HomePage";
import { publicApi } from "../../lib/publicApi";

beforeEach(() => {
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([
    {
      id: 1, name: "Thor", species: "cão", breed: null, sex: "macho", size: "M",
      birth_estimate: null, description: null, photo_url: null, org_id: 1,
      org_name: "Abrigo Amigo Fiel", org_city: "João Pessoa", org_slug: "abrigo-amigo-fiel",
    },
  ]);
});

test("renders animal cards from the API", async () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(await screen.findByText("Thor")).toBeInTheDocument();
  expect(screen.getByText(/Abrigo Amigo Fiel/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test -- src/pages/public/HomePage.test.tsx`
Expected: FAIL (HomePage still uses old markup / import path may differ; at minimum the mock/card structure differs).

- [ ] **Step 4: Re-implement HomePage**

Replace `apps/web/src/pages/public/HomePage.tsx` with:
```tsx
import { useState } from "react";
import { publicApi } from "../../lib/publicApi";
import type { VitrineFilters } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { SEX_OPTIONS, SIZE_OPTIONS, SPECIES_OPTIONS } from "../../lib/labels";
import { AnimalCard } from "../../components/AnimalCard";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const [filters, setFilters] = useState<VitrineFilters>({});
  const { data, loading, error } = useAsync(
    () => publicApi.listAnimals(filters),
    [filters.species, filters.size, filters.sex, filters.city],
  );

  function set(key: keyof VitrineFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground"><a href="/" className="hover:text-primary">Início</a> › Animais para adoção</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Adote um amigo</h1>
        <p className="mt-3 max-w-prose text-lg text-muted-foreground">
          Conheça os animais que estão à espera de um novo lar. Use os filtros para encontrar quem combina com você.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3.5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Espécie</Label>
          <Select value={filters.species ?? ""} onChange={(e) => set("species", e.target.value)}>
            <option value="">Todas</option>
            {SPECIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Porte</Label>
          <Select value={filters.size ?? ""} onChange={(e) => set("size", e.target.value)}>
            <option value="">Todos</option>
            {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Sexo</Label>
          <Select value={filters.sex ?? ""} onChange={(e) => set("sex", e.target.value)}>
            <option value="">Todos</option>
            {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex min-w-35 flex-1 flex-col gap-1.5">
          <Label>Cidade</Label>
          <Input value={filters.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Qualquer cidade" />
        </div>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <Skeleton className="aspect-square rounded-none" />
                <div className="space-y-2 p-4"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32" /></div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="rounded-md border border-border bg-card p-6 text-muted-foreground">{error}</p>}
        {data && data.length === 0 && (
          <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum animal disponível com esses filtros no momento.
          </div>
        )}
        {data && data.length > 0 && (
          <>
            <p className="mb-5 font-semibold"><span className="text-primary">{data.length}</span> {data.length === 1 ? "animal disponível" : "animais disponíveis"}</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.map((a) => <AnimalCard key={a.id} animal={a} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```
(Note: `min-w-35` = 8.75rem; if the arbitrary step is rejected by your Tailwind build, use `min-w-[140px]`.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- src/pages/public/HomePage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Build + full test run**

Run: `npm run build && npm run test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/public/HomePage.tsx apps/web/src/components/AnimalCard.tsx apps/web/src/pages/public/HomePage.test.tsx
git commit -m "feat(web): restyle animal listing with shadcn and shared AnimalCard"
```

---

## Task 9: Restyle Animal detail page

**Files:**
- Modify: `apps/web/src/pages/public/AnimalPublicPage.tsx`

**Interfaces:**
- Consumes: `publicApi.getAnimal`/`createSupportRequest`, shadcn primitives, existing `Modal`, `Select`(existing CSS one is fine to keep inside the modal — but prefer the new one for consistency).
- Produces: no new exports.

- [ ] **Step 1: Re-implement the detail layout, keeping the interest modal logic**

In `apps/web/src/pages/public/AnimalPublicPage.tsx`, keep the `InterestModal` component and its submit logic **unchanged** (it uses the existing `Modal`, `Field`, `Select`, `Alert`, `Button` from `../../components/ui/*` — leave those imports and that component as-is). Only replace the outer `AnimalPublicPage` return markup. Replace the `AnimalPublicPage` function body's `return (...)` with:
```tsx
  return (
    <div>
      <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar à vitrine</Link>
      {loading && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {error && <p className="mt-6 text-muted-foreground">Animal não encontrado.</p>}
      {data && (
        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {data.photo_url ? (
              <img className="aspect-square w-full object-cover" src={data.photo_url} alt={data.name} />
            ) : (
              <div className="grid aspect-square place-items-center text-7xl">🐾</div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {data.species}
              {data.breed ? ` · ${data.breed}` : ""}
              {data.sex ? ` · ${data.sex}` : ""}
              {data.size ? ` · porte ${data.size}` : ""}
              {data.birth_estimate ? ` · ${data.birth_estimate}` : ""}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Resgatado por <Link to={`/ongs/${data.org_slug}`} className="font-semibold text-primary">{data.org_name}</Link>
              {data.org_city ? ` · ${data.org_city}` : ""}
            </p>
            {data.description && <p className="mt-6 leading-relaxed">{data.description}</p>}
            <div className="mt-8">
              <Button onClick={() => setOpen(true)}>Tenho interesse</Button>
            </div>
          </div>
        </div>
      )}
      {data && (
        <InterestModal open={open} onClose={() => setOpen(false)} animalId={animalId} animalName={data.name} />
      )}
    </div>
  );
```
Update the top imports: add `import { Button } from "@/components/ui/button";` and **remove** the now-unused `styles` import (`import styles from "./public.module.css";`) **only if** no remaining code references `styles` (the InterestModal doesn't). If the build reports `styles` unused, remove that import; if `Button` from the old path is now unused in the outer component but still used by InterestModal, keep the old `Button` import too. Verify by build in Step 2.

- [ ] **Step 2: Build to catch unused imports**

Run (from `apps/web`): `npm run build`
Expected: passes. Resolve any `noUnusedLocals` errors by removing genuinely unused imports (`styles`) — do not remove imports still used by `InterestModal`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/public/AnimalPublicPage.tsx
git commit -m "feat(web): restyle animal detail page and link to ONG profile"
```

---

## Task 10: ONG public profile page `/ongs/:slug`

**Files:**
- Create: `apps/web/src/pages/public/OrgPage.tsx`
- Create: `apps/web/src/pages/public/OrgPage.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `publicApi.getOrganization`, `publicApi.listAnimals({ org })`, `AnimalCard`, shadcn primitives.
- Produces: `OrgPage` component; route `/ongs/:slug` inside `PublicLayout`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/public/OrgPage.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { expect, test, vi, beforeEach } from "vitest";
import { OrgPage } from "./OrgPage";
import { publicApi } from "../../lib/publicApi";

beforeEach(() => {
  vi.spyOn(publicApi, "getOrganization").mockResolvedValue({
    id: 1, name: "Abrigo Amigo Fiel", slug: "abrigo-amigo-fiel", city: "João Pessoa",
    description: "Resgatamos e cuidamos.", email: "contato@amigofiel.org", phone: "(83) 99999-0000",
    website: "amigofiel.org", address: "Rua X, 240", founded_year: 2019, verified: true,
    logo_url: null, created_at: "2021-01-01T00:00:00Z", available_count: 3, adopted_count: 12,
  });
  vi.spyOn(publicApi, "listAnimals").mockResolvedValue([]);
});

test("renders the organization profile", async () => {
  render(
    <MemoryRouter initialEntries={["/ongs/abrigo-amigo-fiel"]}>
      <Routes><Route path="/ongs/:slug" element={<OrgPage />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Abrigo Amigo Fiel")).toBeInTheDocument();
  expect(screen.getByText("contato@amigofiel.org")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/pages/public/OrgPage.test.tsx`
Expected: FAIL — `OrgPage` module does not exist.

- [ ] **Step 3: Implement OrgPage**

Create `apps/web/src/pages/public/OrgPage.tsx`:
```tsx
import { useParams, Link } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { AnimalCard } from "../../components/AnimalCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ContactRow({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-accent text-base">{icon}</span>
      <div className="text-sm">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

export function OrgPage() {
  const { slug = "" } = useParams();
  const { data: org, loading, error } = useAsync(() => publicApi.getOrganization(slug), [slug]);
  const { data: animals } = useAsync(() => publicApi.listAnimals({ org: slug }), [slug]);

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;
  if (error || !org) return <p className="text-muted-foreground">ONG não encontrada.</p>;

  const since = new Date(org.created_at).getFullYear();

  return (
    <div>
      <div className="-mx-6 -mt-10 h-40 bg-gradient-to-br from-primary to-[#155E75]" />
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end" style={{ marginTop: -56 }}>
        <div className="grid h-28 w-28 flex-none place-items-center rounded-3xl border-4 border-card bg-gradient-to-br from-[#22D3EE] to-primary text-5xl shadow-md">
          {org.logo_url ? <img src={org.logo_url} alt="" className="h-full w-full rounded-3xl object-cover" /> : "🏠"}
        </div>
        <div className="flex-1 pb-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{org.name}</h1>
            {org.verified && <Badge>✓ ONG verificada</Badge>}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {org.city && <span>📍 {org.city}</span>}
            <span>🗓️ Parceira desde {since}</span>
            <span>🐾 {org.available_count} para adoção</span>
          </div>
        </div>
      </div>

      <div className="mt-11 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {org.description && (
            <Card className="mb-8 p-6">
              <h2 className="mb-3 text-xl font-bold">Sobre a ONG</h2>
              <p className="leading-relaxed text-slate-700">{org.description}</p>
            </Card>
          )}

          <div className="mb-8 grid grid-cols-3 gap-4">
            <Card className="p-5 text-center"><div className="text-2xl font-bold text-primary">{org.available_count}</div><div className="text-sm text-muted-foreground">disponíveis</div></Card>
            <Card className="p-5 text-center"><div className="text-2xl font-bold text-primary">{org.adopted_count}</div><div className="text-sm text-muted-foreground">adoções</div></Card>
            <Card className="p-5 text-center"><div className="text-2xl font-bold text-primary">{org.founded_year ?? since}</div><div className="text-sm text-muted-foreground">fundação</div></Card>
          </div>

          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Animais para adoção</h2>
            <span className="text-sm text-muted-foreground">{animals?.length ?? 0} animais</span>
          </div>
          {animals && animals.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
              Nenhum animal disponível no momento.
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-22 lg:self-start">
          <Card className="border-0 bg-gradient-to-br from-primary to-[#155E75] p-6 text-white">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#cffafe]">Quer ajudar?</h3>
            <p className="mt-3 text-sm text-cyan-50">Adote, doe ou seja voluntário. Todo apoio faz diferença.</p>
            <Button asChild variant="secondary" className="mt-4 w-full"><Link to="/">Ver animais</Link></Button>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</h3>
            <ContactRow icon="📞" label="Telefone" value={org.phone} />
            <ContactRow icon="✉️" label="E-mail" value={org.email} />
            <ContactRow icon="🌐" label="Site" value={org.website} />
            <ContactRow icon="📍" label="Endereço" value={org.address} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
```
(Note: arbitrary utilities like `lg:top-22` = 5.5rem; if rejected, use `lg:top-[88px]`.)

- [ ] **Step 4: Add the route**

In `apps/web/src/App.tsx`, add the import:
```tsx
import { OrgPage } from "./pages/public/OrgPage";
```
and inside the `<Route element={<PublicLayout />}>` block, after the `/animais/:id` route, add:
```tsx
        <Route path="/ongs/:slug" element={<OrgPage />} />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- src/pages/public/OrgPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Build + full test run**

Run: `npm run build && npm run test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/public/OrgPage.tsx apps/web/src/pages/public/OrgPage.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): add public ONG profile page"
```

---

## Task 11: Landing page `/lp`

**Files:**
- Create: `apps/web/src/pages/marketing/LandingPage.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `publicApi.listAnimals`, `AnimalCard`, shadcn `Button`, `Card`.
- Produces: `LandingPage` component; standalone route `/lp` (NOT wrapped in `PublicLayout`).

- [ ] **Step 1: Implement the landing page**

Create `apps/web/src/pages/marketing/LandingPage.tsx`. Port the approved mockup at `docs/mockups/lp.html` into JSX using Tailwind utilities and the shared `AnimalCard` for the "Destaques" section. The static sections (navbar, hero, "Como funciona", "Por que PetConnect", faixa para ONGs, CTA final, footer) reproduce the mockup's copy and structure; the **Destaques** section is dynamic. Full component:
```tsx
import { Link } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { useAsync } from "../../lib/useAsync";
import { AnimalCard } from "../../components/AnimalCard";
import { Button } from "@/components/ui/button";

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6" style={{ height: 68 }}>
        <Link to="/lp" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-[#0891B2] text-white">🐾</span>
          Pet<span className="text-primary">Connect</span>
        </Link>
        <nav className="ml-2 hidden gap-7 md:flex">
          <a href="#como" className="text-sm font-medium text-muted-foreground hover:text-foreground">Como funciona</a>
          <a href="#destaques" className="text-sm font-medium text-muted-foreground hover:text-foreground">Animais</a>
          <a href="#porque" className="text-sm font-medium text-muted-foreground hover:text-foreground">Por que nós</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="outline" size="sm"><Link to="/login">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/">Ver animais</Link></Button>
        </div>
      </div>
    </header>
  );
}

function Highlights() {
  const { data } = useAsync(() => publicApi.listAnimals(), []);
  const featured = (data ?? []).slice(0, 4);
  if (featured.length === 0) return null;
  return (
    <section id="destaques" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Esperando por você</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Animais em destaque</h2>
          <p className="mt-3.5 text-lg text-muted-foreground">Alguns dos amigos prontos para um novo lar agora.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((a) => <AnimalCard key={a.id} animal={a} />)}
        </div>
        <div className="mt-11 text-center">
          <Button asChild size="lg"><Link to="/">Ver todos os animais →</Link></Button>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: 1, t: "Busque", d: "Use os filtros por espécie, porte, sexo e cidade para encontrar quem combina com o seu momento." },
  { n: 2, t: "Conheça", d: "Veja o perfil completo: personalidade, histórico de saúde, vacinas e a ONG responsável." },
  { n: 3, t: "Adote", d: "Fale direto com a ONG, envie sua solicitação e combine a visita. Sem intermediários." },
];

const FEATURES = [
  { i: "🔎", t: "Busca com filtros reais", d: "Espécie, porte, sexo e cidade. Encontre rápido os animais compatíveis com a sua rotina." },
  { i: "🩺", t: "Histórico de saúde completo", d: "Vacinas, castração, vermifugação e observações clínicas registradas pela ONG." },
  { i: "💬", t: "Contato direto com a ONG", d: "Envie sua solicitação de adoção e converse com quem realmente conhece o animal." },
  { i: "🛡️", t: "ONGs verificadas", d: "Trabalhamos apenas com abrigos e protetores cadastrados e acompanhados pela plataforma." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_82%_-10%,#ECFEFF,transparent_60%),radial-gradient(700px_500px_at_0%_110%,#F0FDFA,transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" /> Adoção responsável e transparente
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl">
              Encontre seu <span className="text-primary">novo melhor amigo</span> para adotar
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Reunimos animais de ONGs e abrigos parceiros em um só lugar. Filtre, conheça a história de cada um e fale direto com quem cuida.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Button asChild size="lg"><Link to="/">Ver animais para adoção →</Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#como">Como funciona</a></Button>
            </div>
            <div className="mt-11 flex gap-9">
              <div><div className="text-2xl font-bold tracking-tight">320+</div><div className="text-sm text-muted-foreground">animais disponíveis</div></div>
              <div><div className="text-2xl font-bold tracking-tight">45</div><div className="text-sm text-muted-foreground">ONGs parceiras</div></div>
              <div><div className="text-2xl font-bold tracking-tight">1.240</div><div className="text-sm text-muted-foreground">adoções realizadas</div></div>
            </div>
          </div>
          <div className="relative mx-auto max-w-md">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="grid aspect-[4/3.4] place-items-center bg-[radial-gradient(120%_120%_at_70%_20%,#67E8F9,#22D3EE_30%,#0E7490)] text-8xl text-white">🐶</div>
              <div className="flex items-center justify-between p-4">
                <div><div className="font-bold">Thor</div><div className="text-sm text-muted-foreground">SRD · Macho · Porte médio</div></div>
                <span className="rounded-full border border-[#cffafe] bg-accent px-2.5 py-0.5 text-xs font-semibold text-primary">Disponível</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como" className="border-y border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Simples assim</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Adotar em três passos</h2>
            <p className="mt-3.5 text-lg text-muted-foreground">Do primeiro clique ao dia em que ele chega em casa.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-card p-7">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#cffafe] bg-accent text-lg font-bold text-primary">{s.n}</div>
                <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Highlights />

      <section id="porque" className="border-y border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Por que PetConnect</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Adoção com informação e confiança</h2>
            <p className="mt-3.5 text-lg text-muted-foreground">Tudo o que você precisa para decidir com segurança — e cuidar bem depois.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.t} className="flex gap-4 rounded-xl border border-border bg-card p-6">
                <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-accent text-2xl">{f.i}</div>
                <div><h3 className="text-lg font-bold">{f.t}</h3><p className="mt-1.5 text-muted-foreground">{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ongs" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-8 rounded-2xl bg-gradient-to-br from-primary to-[#155E75] p-12 text-white md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">É uma ONG ou abrigo?</h2>
              <p className="mt-3 text-lg text-cyan-50">Cadastre seus animais, organize o histórico de saúde e receba solicitações de adoção — tudo em um painel gratuito.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="secondary"><Link to="/registrar">Cadastrar minha ONG</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card py-20 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tem espaço no sofá e no coração?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Milhares de animais esperam por um lar. O próximo pode estar a um clique de você.</p>
          <div className="mt-8"><Button asChild size="lg"><Link to="/">Encontrar meu amigo →</Link></Button></div>
        </div>
      </section>

      <footer className="bg-[#0F172A] py-10 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-sm">
          <div className="text-base font-bold text-white">🐾 Pet<span className="text-[#67E8F9]">Connect</span></div>
          <span>© 2026 PetConnect · Feito com 🤍 para os animais.</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Add the standalone route**

In `apps/web/src/App.tsx`, add the import:
```tsx
import { LandingPage } from "./pages/marketing/LandingPage";
```
and add this route as the **first** child of `<Routes>` (before the `<Route element={<PublicLayout />}>` block), so it renders without the public layout chrome:
```tsx
      <Route path="/lp" element={<LandingPage />} />
```

- [ ] **Step 3: Build + full test run**

Run (from `apps/web`): `npm run build && npm run test`
Expected: build passes; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/marketing/LandingPage.tsx apps/web/src/App.tsx
git commit -m "feat(web): add marketing landing page at /lp"
```

---

## Task 12: End-to-end verification with real data

**Files:** none (verification only).

- [ ] **Step 1: Apply migrations and seed (docker compose)**

From repo root, bring up the stack and run the migration + seed. Use the documented commands (see `README.md`); typically:
```bash
docker compose up -d db
# with API venv active and DATABASE_URL set to the compose DB:
cd apps/api && alembic upgrade head && python -m app.seed
```
Expected: `0003_organization_public_profile` applied; seed prints "Seeded demo ONG 'Abrigo Amigo Fiel'…" (or "already present").

- [ ] **Step 2: Verify the API surface**

```bash
curl -s localhost:8000/api/public/organizations/abrigo-amigo-fiel | head -c 400
curl -s "localhost:8000/api/public/animals?org=abrigo-amigo-fiel" | head -c 300
```
Expected: org JSON includes `verified: true`, `available_count`, `adopted_count`, contact fields; animals list includes `org_name`/`org_slug`.

- [ ] **Step 3: Drive the web app**

Start the web dev server (`cd apps/web && npm run dev`) and open, confirming each renders with real data:
- `/lp` — hero, steps, **Destaques with real seeded animals**, features, ONG band, footer; "Ver animais" → `/`.
- `/` — filters + card grid; cards show cidade · ONG.
- `/animais/:id` — detail with link to `/ongs/abrigo-amigo-fiel`.
- `/ongs/abrigo-amigo-fiel` — cover, verified badge, Sobre, stats, animals grid, contact panel.
- `/login`, `/registrar` — restyled forms still submit.
- Spot-check an **admin** page (`/admin` after login) to confirm the CSS-module UI is visually unchanged.

- [ ] **Step 4: Final full test pass**

Run: `cd apps/api && pytest -q` and `cd apps/web && npm run lint && npm run test && npm run build`
Expected: all green.

- [ ] **Step 5: Commit any verification fixes**

If Step 3 surfaced fixes, commit them with a descriptive message. Otherwise nothing to commit.

---

## Self-Review Notes

- **Spec coverage:** Tailwind+shadcn foundation (T5) · teal token mapping (T5) · no dark mode (T5 css, global constraint) · Home restyle (T8) · detail restyle (T9) · login/register restyle (T7) · PublicLayout restyle (T7) · `/lp` landing, adopter-focused, dynamic Destaques (T11) · ONG page `/ongs/:slug` (T10) · Organization new columns + migration (T1) · PublicAnimal org fields (T2) · public org endpoint + org filter + stats (T3) · seed enrichment (T4) · types/api client (T6) · routing (T10, T11) · admin untouched (global constraint) · tests + verification (T2, T3, T8, T10, T12). All spec sections map to a task.
- **Admin regression risk:** global `* { border-color: var(--border) }` could shift admin borders; T12 Step 3 explicitly spot-checks an admin page.
- **Arbitrary Tailwind utilities:** where non-standard steps appear (`min-w-35`, `lg:top-22`, `h-[52px]`), fallbacks in `[..]` bracket syntax are noted inline.
