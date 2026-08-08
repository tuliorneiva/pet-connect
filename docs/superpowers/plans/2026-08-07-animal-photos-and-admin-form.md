# Fotos do animal e formulário da ONG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o campo `photo_url` por upload real de até 4 fotos guardadas no Supabase Storage, e redesenhar o formulário de criação/edição de animal para o layout do mockup aprovado.

**Architecture:** Uma tabela `animal_photo` substitui a coluna `animal.photo_url`; o acesso ao bucket fica atrás de uma interface `Storage` injetada por dependência do FastAPI, para que nenhum teste toque a rede. O response continua expondo `photo_url` (derivado da capa) além do novo `photos: string[]`, então a vitrine e os cards não mudam. No front, o formulário vira grid de duas colunas com as ações no cabeçalho, e o campo de URL vira um uploader de 4 slots que reduz a imagem no navegador antes de enviar.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, boto3 (endpoint S3-compatível do Supabase), React 19, Radix/shadcn, Tailwind v4, pytest, vitest + Testing Library.

## Global Constraints

- **Máximo de 4 fotos por animal** (capa + 3), validado na API e no componente.
- **Content-types aceitos:** `image/jpeg`, `image/png`, `image/webp`. Qualquer outro → 422.
- **Tamanho máximo por arquivo:** 1 MB (1_048_576 bytes), limite do bucket. Acima → 422.
- **Mensagens de erro da API em português.**
- **A chave do objeto é sempre gerada no servidor:** `animals/<uuid4>.<ext>`, com a extensão derivada do content-type validado — nunca do nome enviado pelo cliente.
- **Supabase exige path-style addressing:** `Config(s3={"addressing_style": "path"})` no boto3. Sem isso a conexão falha.
- **Nenhum teste toca a rede.** O storage é sempre dublado via `app.dependency_overrides`.
- **Nenhum segredo entra no código.** O repositório é público. As chaves vivem só no `.env` (já gitignorado) e nas variáveis de ambiente do Railway.
- **Light-mode only, paleta azul, primária `#0E7490`.** Não introduzir variantes dark.
- **Comentários e textos de UI em português.** Comente o *porquê*, não o *o quê*, seguindo o estilo do código existente.

## Desvios conscientes da spec

Dois pontos onde este plano diverge da spec aprovada, de propósito:

1. **Assinatura do `Storage.save`.** A spec escreve `save(upload: UploadFile) -> str`. Aqui é `save(data: bytes, content_type: str) -> str`. O router já precisa ler os bytes para validar o tamanho, e uma interface que recebe bytes é dublável sem construir um `UploadFile` falso em cada teste. O efeito para quem chama é o mesmo.

2. **Falha parcial de upload ao criar animal.** A spec diz "a tela vai para o detalhe dele com um alerta". Navegar perderia os objetos `File` retidos em memória, e sem eles o botão "tentar de novo" não teria o que reenviar. Aqui o formulário permanece na tela, passa a se comportar como edição (já tem o id do animal criado) e mostra o alerta com o botão de retentativa. O animal continua não sendo desfeito, que era o ponto da regra.

## Estrutura de arquivos

**Backend**

| arquivo | responsabilidade |
|---|---|
| `apps/api/app/services/storage.py` | interface `Storage`, `S3Storage`, `get_storage()`, `resolve_photo_url()` |
| `apps/api/app/models/animal_photo.py` | modelo `AnimalPhoto` com a propriedade `url` |
| `apps/api/alembic/versions/0004_animal_photos.py` | cria a tabela, converte `photo_url`, dropa a coluna |
| `apps/api/app/schemas/animal_photo.py` | `AnimalPhotoResponse` |
| `apps/api/app/routers/animal_photos.py` | POST / DELETE / PATCH cover |

**Frontend**

| arquivo | responsabilidade |
|---|---|
| `apps/web/src/lib/resizeImage.ts` | reduz e reencoda a imagem antes do envio |
| `apps/web/src/components/admin/PhotoUploader.tsx` | grade de 4 slots, capa, remover, adicionar |
| `apps/web/src/components/shadcn/textarea.tsx` | textarea shadcn (não existe ainda) |

---

### Task 1: Configuração e serviço de storage

**Files:**
- Modify: `apps/api/requirements.txt`
- Modify: `apps/api/app/core/config.py`
- Create: `apps/api/app/services/storage.py`
- Create: `apps/api/tests/test_storage.py`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces:
  - `Storage` (Protocol) com `save(data: bytes, content_type: str) -> str`, `delete(key: str) -> None`, `url(key: str) -> str`
  - `S3Storage(bucket, endpoint, region, access_key, secret_key, public_url)`
  - `get_storage() -> Storage` — dependência FastAPI, é o que os testes sobrescrevem
  - `resolve_photo_url(storage_key: str, is_external: bool) -> str`
  - `EXTENSION_BY_CONTENT_TYPE: dict[str, str]`
  - `MAX_PHOTO_BYTES: int`, `MAX_PHOTOS_PER_ANIMAL: int`
  - `settings.storage_bucket` / `storage_endpoint` / `storage_region` / `storage_access_key` / `storage_secret_key` / `storage_public_url`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api/tests/test_storage.py`:

```python
import uuid

import pytest

from app.services.storage import (
    EXTENSION_BY_CONTENT_TYPE,
    MAX_PHOTO_BYTES,
    MAX_PHOTOS_PER_ANIMAL,
    build_storage_key,
    resolve_photo_url,
)


def test_limits_match_the_bucket_and_the_layout():
    assert MAX_PHOTO_BYTES == 1_048_576
    assert MAX_PHOTOS_PER_ANIMAL == 4


def test_accepted_content_types_map_to_extensions():
    assert EXTENSION_BY_CONTENT_TYPE == {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }


def test_key_is_generated_server_side_and_ignores_the_client_filename():
    key = build_storage_key("image/png")
    assert key.startswith("animals/")
    assert key.endswith(".png")
    # o miolo é um uuid4 válido, não algo vindo do cliente
    uuid.UUID(key.removeprefix("animals/").removesuffix(".png"))


def test_two_keys_never_collide():
    assert build_storage_key("image/jpeg") != build_storage_key("image/jpeg")


def test_key_for_unknown_content_type_is_a_programming_error():
    # O router valida antes; chegar aqui com tipo inválido é bug nosso, não do usuário.
    with pytest.raises(KeyError):
        build_storage_key("application/pdf")


def test_external_url_is_returned_untouched():
    # O seed grava URLs completas com is_external=True; elas não levam prefixo de bucket.
    assert (
        resolve_photo_url("https://placedog.net/500/375?id=1", is_external=True)
        == "https://placedog.net/500/375?id=1"
    )


def test_internal_key_is_prefixed_with_the_public_base_url(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "storage_public_url", "https://cdn.example/bucket/")
    # a barra final da configuração não pode virar barra dupla na URL
    assert (
        resolve_photo_url("animals/abc.jpg", is_external=False)
        == "https://cdn.example/bucket/animals/abc.jpg"
    )
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T api pytest tests/test_storage.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'app.services.storage'`

- [ ] **Step 3: Adicionar a dependência**

Em `apps/api/requirements.txt`, logo depois de `psycopg2-binary==2.9.*`:

```
boto3==1.35.*
```

- [ ] **Step 4: Adicionar as configurações de storage**

Em `apps/api/app/core/config.py`, dentro de `Settings`, depois de `cors_origins`:

```python
    storage_bucket: str = ""
    storage_endpoint: str = ""
    storage_region: str = "us-east-1"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_public_url: str = ""
```

E um novo validador, depois de `_guard_secret_key_default`:

```python
    @model_validator(mode="after")
    def _guard_storage_outside_dev(self) -> "Settings":
        """Fora de dev, subir sem storage configurado só se descobre quando a ONG
        tenta mandar a primeira foto e toma erro. Falhar no boot é mais barato."""
        if self.environment == "dev":
            return self
        missing = [
            name
            for name in (
                "storage_bucket",
                "storage_endpoint",
                "storage_access_key",
                "storage_secret_key",
                "storage_public_url",
            )
            if not getattr(self, name)
        ]
        if missing:
            raise ValueError(
                "Storage não configurado fora de dev: " + ", ".join(sorted(missing))
            )
        return self
```

- [ ] **Step 5: Escrever o serviço**

Criar `apps/api/app/services/storage.py`:

```python
"""Acesso ao bucket de fotos, atrás de uma interface pequena.

O fornecedor de hoje é o Supabase Storage pela API S3, mas nada fora deste módulo
sabe disso: trocar para R2 ou S3 é trocar variáveis de ambiente.
"""
import uuid
from typing import Protocol

import boto3
from botocore.client import Config

from app.core.config import settings

EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

# Limite do bucket. O navegador já reduz a imagem antes de enviar; esta validação
# é rede de segurança, não o caminho normal.
MAX_PHOTO_BYTES = 1_048_576

# Capa + 3. O layout da página do animal é desenhado para exatamente isso.
MAX_PHOTOS_PER_ANIMAL = 4


def build_storage_key(content_type: str) -> str:
    """Nome do objeto no bucket, sempre gerado aqui.

    O nome enviado pelo cliente nunca é usado: é vetor de path traversal e não
    acrescenta nada, já que a foto é identificada pela linha no banco.
    """
    return f"animals/{uuid.uuid4()}.{EXTENSION_BY_CONTENT_TYPE[content_type]}"


def resolve_photo_url(storage_key: str, is_external: bool) -> str:
    """URL pública da foto.

    Fotos com ``is_external`` já guardam a URL inteira em ``storage_key`` — é como o
    seed sobrevive sem internet e como as ``photo_url`` legadas foram migradas.
    """
    if is_external:
        return storage_key
    return f"{settings.storage_public_url.rstrip('/')}/{storage_key}"


class Storage(Protocol):
    def save(self, data: bytes, content_type: str) -> str: ...
    def delete(self, key: str) -> None: ...
    def url(self, key: str) -> str: ...


class S3Storage:
    def __init__(
        self,
        bucket: str,
        endpoint: str,
        region: str,
        access_key: str,
        secret_key: str,
        public_url: str,
    ) -> None:
        self._bucket = bucket
        self._public_url = public_url
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            # O Supabase só aceita path-style; sem isto o boto3 tenta bucket.endpoint
            # e a conexão falha.
            config=Config(s3={"addressing_style": "path"}),
        )

    def save(self, data: bytes, content_type: str) -> str:
        key = build_storage_key(content_type)
        self._client.put_object(
            Bucket=self._bucket, Key=key, Body=data, ContentType=content_type
        )
        return key

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)

    def url(self, key: str) -> str:
        return resolve_photo_url(key, is_external=False)


def get_storage() -> Storage:
    """Dependência do FastAPI. Os testes sobrescrevem isto — nenhum teste toca a rede."""
    return S3Storage(
        bucket=settings.storage_bucket,
        endpoint=settings.storage_endpoint,
        region=settings.storage_region,
        access_key=settings.storage_access_key,
        secret_key=settings.storage_secret_key,
        public_url=settings.storage_public_url,
    )
```

- [ ] **Step 6: Documentar as variáveis no `.env.example`**

Acrescentar ao final de `.env.example`:

```
# Storage de fotos — Supabase Storage pela API S3.
# Em Project Settings › Storage › S3 Connection do Supabase.
# NUNCA commite valores reais aqui: este arquivo vai para o repositório público.
STORAGE_BUCKET=animais
STORAGE_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
STORAGE_REGION=sa-east-1
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public/animais
```

- [ ] **Step 7: Reconstruir a imagem (boto3 é dependência nova) e rodar os testes**

Run: `docker compose up -d --build api && docker compose exec -T api pytest tests/test_storage.py -v`
Expected: PASS (7 testes)

- [ ] **Step 8: Rodar a suíte inteira e o linter**

Run: `docker compose exec -T api pytest -q && docker compose exec -T api ruff check .`
Expected: 47 passed, ruff sem erros

- [ ] **Step 9: Commit**

```bash
git add apps/api/requirements.txt apps/api/app/core/config.py apps/api/app/services/storage.py apps/api/tests/test_storage.py .env.example
git commit -m "feat(api): interface de storage sobre o bucket S3 do Supabase"
```

---

### Task 2: Modelo `animal_photo` e migration

**Files:**
- Create: `apps/api/app/models/animal_photo.py`
- Modify: `apps/api/app/models/__init__.py`
- Modify: `apps/api/app/models/animal.py`
- Create: `apps/api/alembic/versions/0004_animal_photos.py`
- Create: `apps/api/tests/test_animal_photo_model.py`

**Interfaces:**
- Consumes: `resolve_photo_url` (Task 1)
- Produces:
  - `AnimalPhoto` com colunas `id`, `animal_id`, `storage_key`, `is_external`, `sort_order`, `created_at` e a propriedade `url -> str`
  - `Animal.photos: list[AnimalPhoto]`, ordenada por `sort_order`, com `cascade="all, delete-orphan"`
  - `Animal.photo_url` **deixa de existir**

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api/tests/test_animal_photo_model.py`:

```python
from app.models import Animal, AnimalPhoto, Organization


def _org(db_session) -> Organization:
    org = Organization(name="Abrigo A", slug="abrigo-a", city="João Pessoa")
    db_session.add(org)
    db_session.flush()
    return org


def test_photos_come_back_in_sort_order(db_session):
    org = _org(db_session)
    animal = Animal(org_id=org.id, name="Rex", species="cão")
    db_session.add(animal)
    db_session.flush()

    # inseridas fora de ordem de propósito
    db_session.add(AnimalPhoto(animal_id=animal.id, storage_key="animals/b.jpg", sort_order=1))
    db_session.add(AnimalPhoto(animal_id=animal.id, storage_key="animals/a.jpg", sort_order=0))
    db_session.commit()
    db_session.refresh(animal)

    assert [p.storage_key for p in animal.photos] == ["animals/a.jpg", "animals/b.jpg"]


def test_deleting_the_animal_deletes_its_photos(db_session):
    org = _org(db_session)
    animal = Animal(org_id=org.id, name="Rex", species="cão")
    db_session.add(animal)
    db_session.flush()
    db_session.add(AnimalPhoto(animal_id=animal.id, storage_key="animals/a.jpg", sort_order=0))
    db_session.commit()

    db_session.delete(animal)
    db_session.commit()

    assert db_session.query(AnimalPhoto).count() == 0


def test_url_of_an_external_photo_is_the_stored_value(db_session):
    photo = AnimalPhoto(storage_key="https://placedog.net/500/375", is_external=True, sort_order=0)
    assert photo.url == "https://placedog.net/500/375"


def test_url_of_an_internal_photo_uses_the_public_base(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "storage_public_url", "https://cdn.example/bucket")
    photo = AnimalPhoto(storage_key="animals/a.jpg", is_external=False, sort_order=0)
    assert photo.url == "https://cdn.example/bucket/animals/a.jpg"


def test_animal_no_longer_carries_a_photo_url_column(db_session):
    # A coluna virou tabela; se ela ressuscitar, dois lugares passam a discordar
    # sobre qual é a capa.
    assert "photo_url" not in Animal.__table__.columns
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T api pytest tests/test_animal_photo_model.py -v`
Expected: FAIL com `ImportError: cannot import name 'AnimalPhoto'`

- [ ] **Step 3: Criar o modelo**

Criar `apps/api/app/models/animal_photo.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.services.storage import resolve_photo_url


class AnimalPhoto(Base):
    __tablename__ = "animal_photo"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Foto sem animal não existe: ON DELETE CASCADE no banco, delete-orphan na ORM.
    animal_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("animal.id", ondelete="CASCADE"), index=True
    )
    # Guarda a chave no bucket ou, quando is_external, a URL completa.
    storage_key: Mapped[str] = mapped_column(String(500))
    is_external: Mapped[bool] = mapped_column(Boolean, default=False)
    # Menor valor é a capa.
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @property
    def url(self) -> str:
        return resolve_photo_url(self.storage_key, self.is_external)
```

- [ ] **Step 4: Registrar o modelo e ligar o relacionamento**

Em `apps/api/app/models/__init__.py`, acrescentar `AnimalPhoto` ao import e ao `__all__`, seguindo o formato das entradas que já existem lá.

Em `apps/api/app/models/animal.py`:

- acrescentar `AnimalPhoto` ao bloco `if TYPE_CHECKING:`
- **remover** a linha `photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)`
- acrescentar, depois da relação `organization`:

```python
    photos: Mapped[list["AnimalPhoto"]] = relationship(
        "AnimalPhoto",
        # Ordenar aqui evita que cada consumidor tenha de lembrar qual é a capa.
        order_by="AnimalPhoto.sort_order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
```

Se `String` ficar sem uso em `animal.py` depois de remover a coluna, o ruff acusa — confira os outros campos antes de mexer no import.

- [ ] **Step 5: Escrever a migration**

Criar `apps/api/alembic/versions/0004_animal_photos.py`:

```python
"""animal photos table

Revision ID: 0004_animal_photos
Revises: 0003_organization_public_profile
Create Date: 2026-08-07
"""
import uuid

import sqlalchemy as sa
from alembic import op

revision = "0004_animal_photos"
down_revision = "0003_organization_public_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "animal_photo",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "animal_id",
            sa.Uuid(),
            sa.ForeignKey("animal.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("is_external", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_animal_photo_animal_id", "animal_photo", ["animal_id"])

    # Converte antes de dropar: nenhuma foto existente se perde. As legadas são
    # links externos, então entram com is_external=True.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, photo_url FROM animal WHERE photo_url IS NOT NULL AND photo_url <> ''")
    ).fetchall()
    for animal_id, photo_url in rows:
        conn.execute(
            sa.text(
                "INSERT INTO animal_photo (id, animal_id, storage_key, is_external, sort_order)"
                " VALUES (:id, :animal_id, :storage_key, true, 0)"
            ),
            {"id": uuid.uuid4(), "animal_id": animal_id, "storage_key": photo_url},
        )

    op.drop_column("animal", "photo_url")


def downgrade() -> None:
    op.add_column("animal", sa.Column("photo_url", sa.String(length=500), nullable=True))

    # Devolve a capa de cada animal para a coluna.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT DISTINCT ON (animal_id) animal_id, storage_key"
            " FROM animal_photo ORDER BY animal_id, sort_order"
        )
    ).fetchall()
    for animal_id, storage_key in rows:
        conn.execute(
            sa.text("UPDATE animal SET photo_url = :url WHERE id = :id"),
            {"url": storage_key, "id": animal_id},
        )

    op.drop_index("ix_animal_photo_animal_id", table_name="animal_photo")
    op.drop_table("animal_photo")
```

- [ ] **Step 6: Rodar os testes do modelo**

Run: `docker compose exec -T api pytest tests/test_animal_photo_model.py -v`
Expected: PASS (5 testes)

Se `test_deleting_the_animal_deletes_its_photos` falhar, é o SQLite: ele ignora `ON DELETE CASCADE` sem `PRAGMA foreign_keys=ON`. O `cascade="all, delete-orphan"` da ORM é justamente o que faz o teste passar nos dois bancos — confira que ele está na relação.

- [ ] **Step 7: Verificar a migration num banco de verdade**

Run: `docker compose exec -T api alembic upgrade head && docker compose exec -T api alembic downgrade -1 && docker compose exec -T api alembic upgrade head`
Expected: as três rodam sem erro. O ciclo prova que o `downgrade` funciona.

- [ ] **Step 8: Rodar a suíte inteira**

Run: `docker compose exec -T api pytest -q`
Expected: falham os testes que ainda esperam `photo_url` no payload de animal — isso é a Task 4. Anote quais falharam e siga; **não conserte aqui**.

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/models/ apps/api/alembic/versions/0004_animal_photos.py apps/api/tests/test_animal_photo_model.py
git commit -m "feat(api): tabela animal_photo e migração da coluna photo_url"
```

---

### Task 3: Responses derivam `photos` e `photo_url`

**Files:**
- Create: `apps/api/app/schemas/animal_photo.py`
- Modify: `apps/api/app/schemas/animal.py`
- Modify: `apps/api/app/seed.py`
- Modify: `apps/api/tests/test_animals.py`
- Create: `apps/api/tests/test_animal_photo_serialization.py`

**Nota:** `apps/api/app/schemas/animal_photo.py` nasce nesta task (conteúdo no Step 3). A Task 4 o consome já pronto.

**Interfaces:**
- Consumes: `Animal.photos`, `AnimalPhoto.url` (Task 2)
- Produces:
  - `AnimalResponse.photos: list[str]` e `AnimalResponse.photo_url: str | None` (derivado da capa)
  - `AnimalResponse.photo_items: list[AnimalPhotoResponse]` — **só no admin**
  - `PublicAnimalListResponse.photos` / `.photo_url` idem, **sem** `photo_items`
  - `AnimalCreate` e `AnimalUpdate` **não aceitam mais** `photo_url`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api/tests/test_animal_photo_serialization.py`:

```python
from app.models import Animal, AnimalPhoto, Organization
from app.schemas.animal import AnimalCreate, AnimalResponse


def _animal_with_photos(db_session, keys_and_orders):
    org = Organization(name="Abrigo A", slug="abrigo-a", city="João Pessoa")
    db_session.add(org)
    db_session.flush()
    animal = Animal(org_id=org.id, name="Rex", species="cão")
    db_session.add(animal)
    db_session.flush()
    for key, order in keys_and_orders:
        db_session.add(
            AnimalPhoto(animal_id=animal.id, storage_key=key, is_external=True, sort_order=order)
        )
    db_session.commit()
    db_session.refresh(animal)
    return animal


def test_photos_serialize_as_urls_in_sort_order(db_session):
    animal = _animal_with_photos(db_session, [("https://x/b.jpg", 1), ("https://x/a.jpg", 0)])
    body = AnimalResponse.model_validate(animal)
    assert body.photos == ["https://x/a.jpg", "https://x/b.jpg"]


def test_photo_url_mirrors_the_cover(db_session):
    animal = _animal_with_photos(db_session, [("https://x/b.jpg", 1), ("https://x/a.jpg", 0)])
    assert AnimalResponse.model_validate(animal).photo_url == "https://x/a.jpg"


def test_photo_url_is_null_without_photos(db_session):
    animal = _animal_with_photos(db_session, [])
    body = AnimalResponse.model_validate(animal)
    assert body.photo_url is None
    assert body.photos == []


def test_create_payload_rejects_a_photo_url():
    # Foto agora entra por upload. Aceitar a URL aqui seria uma segunda fonte da verdade.
    payload = AnimalCreate.model_validate({"name": "Rex", "species": "cão", "photo_url": "https://x/a.jpg"})
    assert not hasattr(payload, "photo_url")


def test_admin_response_carries_photo_ids(db_session):
    # A ONG precisa do id para remover a foto e trocar a capa.
    animal = _animal_with_photos(db_session, [("https://x/a.jpg", 0)])
    body = AnimalResponse.model_validate(animal)
    assert body.photo_items[0].url == "https://x/a.jpg"
    assert body.photo_items[0].id == animal.photos[0].id


def test_public_response_does_not_carry_photo_ids(db_session):
    # Id de foto é ferramenta de edição; não tem por que vazar para a vitrine.
    animal = _animal_with_photos(db_session, [("https://x/a.jpg", 0)])
    body = PublicAnimalListResponse.model_validate(animal)
    assert "photo_items" not in body.model_dump()
```

Acrescentar `PublicAnimalListResponse` ao import de `app.schemas.animal` no topo do arquivo.

Acrescentar a `apps/api/tests/test_animals.py`:

```python
def test_public_listing_and_detail_expose_photos(client):
    token = _register(client)
    animal = client.post(
        "/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}
    ).json()

    # Sem fotos, os dois lados concordam: lista vazia e capa nula.
    assert animal["photos"] == []
    assert animal["photo_url"] is None

    listing = client.get("/api/public/animals").json()
    assert listing[0]["photos"] == []
    detail = client.get(f"/api/public/animals/{animal['id']}").json()
    assert detail["photos"] == []
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `docker compose exec -T api pytest tests/test_animal_photo_serialization.py tests/test_animals.py -v`
Expected: FAIL — `AnimalResponse` ainda não tem `photos`, e `AnimalCreate` ainda aceita `photo_url`

- [ ] **Step 3: Criar o schema da foto e reescrever os schemas do animal**

Criar `apps/api/app/schemas/animal_photo.py`:

```python
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnimalPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    sort_order: int
```

Em seguida, os schemas do animal:

Em `apps/api/app/schemas/animal.py`, trocar o import de `pydantic` por:

```python
from pydantic import AliasPath, BaseModel, ConfigDict, Field, field_validator, model_validator
```

Remover a linha `photo_url: str | None = None` de `AnimalBase` **e** de `AnimalUpdate`.

Acrescentar, antes de `AnimalResponse`:

```python
class _PhotoFields(BaseModel):
    """Deriva as fotos do relacionamento.

    ``photo_url`` continua no response, espelhando a capa: a vitrine, o ``AnimalCard``
    e a página da ONG seguem funcionando sem saber que agora existe uma tabela.
    """

    photos: list[str] = []
    photo_url: str | None = None

    @field_validator("photos", mode="before")
    @classmethod
    def _photos_to_urls(cls, value: object) -> object:
        if not isinstance(value, list):
            return value
        return [getattr(item, "url", item) for item in value]

    @model_validator(mode="after")
    def _cover_from_photos(self) -> "_PhotoFields":
        if self.photo_url is None and self.photos:
            self.photo_url = self.photos[0]
        return self
```

Acrescentar o import do schema da foto, no topo do arquivo:

```python
from app.schemas.animal_photo import AnimalPhotoResponse
```

Trocar a declaração de `AnimalResponse` e dar a ela o campo com os ids:

```python
class AnimalResponse(AnimalBase, _PhotoFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    created_at: datetime
    # A ONG precisa do id de cada foto para remover e trocar a capa; o adotante não.
    # Por isso este campo existe só aqui, e não em PublicAnimalListResponse.
    photo_items: list[AnimalPhotoResponse] = Field(default=[], validation_alias="photos")
```

E em `PublicAnimalListResponse`, remover a linha `photo_url: str | None` e fazer a classe herdar de `_PhotoFields`:

```python
class PublicAnimalListResponse(_PhotoFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    species: str
    breed: str | None
    sex: str | None
    size: str | None
    birth_estimate: str | None
    description: str | None
    org_id: UUID
    org_name: str = Field(validation_alias=AliasPath("organization", "name"))
    org_city: str | None = Field(default=None, validation_alias=AliasPath("organization", "city"))
    org_slug: str = Field(validation_alias=AliasPath("organization", "slug"))
```

- [ ] **Step 4: Migrar o seed para a nova tabela**

Em `apps/api/app/seed.py`:

- acrescentar `AnimalPhoto` ao import de `app.models`
- remover o argumento `photo_url=...` das cinco chamadas de `Animal(...)`
- depois de `db.flush()` (a linha que segue `db.add_all(animals)`), acrescentar:

```python
        # O seed roda offline: as fotos de demonstração entram como links externos,
        # sem download e sem tocar no bucket.
        demo_photos = [
            "https://placedog.net/500/375?id=1",
            "https://placedog.net/500/375?id=2",
            "https://placekitten.com/500/375",
            "https://placekitten.com/501/375",
            "https://placedog.net/500/375?id=3",
        ]
        for animal, url in zip(animals, demo_photos):
            db.add(
                AnimalPhoto(
                    animal_id=animal.id, storage_key=url, is_external=True, sort_order=0
                )
            )
```

- [ ] **Step 5: Rodar os testes**

Run: `docker compose exec -T api pytest tests/test_animal_photo_serialization.py tests/test_animals.py -v`
Expected: PASS

- [ ] **Step 6: Rodar a suíte inteira e o linter**

Run: `docker compose exec -T api pytest -q && docker compose exec -T api ruff check .`
Expected: tudo passa, ruff limpo. Os testes que a Task 2 deixou vermelhos ficam verdes aqui.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/animal.py apps/api/app/seed.py apps/api/tests/
git commit -m "feat(api): responses derivam photos e capa da tabela animal_photo"
```

---

### Task 4: Endpoints de upload, remoção e capa

**Files:**
- Create: `apps/api/app/routers/animal_photos.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_animal_photos_api.py`

`apps/api/app/schemas/animal_photo.py` já existe desde a Task 3 — não recrie.

**Interfaces:**
- Consumes: `Storage`, `get_storage`, `MAX_PHOTO_BYTES`, `MAX_PHOTOS_PER_ANIMAL`, `EXTENSION_BY_CONTENT_TYPE` (Task 1); `AnimalPhoto` (Task 2)
- Produces:
  - `POST /api/admin/animals/{animal_id}/photos` → 201 `AnimalPhotoResponse`
  - `DELETE /api/admin/animals/{animal_id}/photos/{photo_id}` → 204
  - `PATCH /api/admin/animals/{animal_id}/photos/{photo_id}/cover` → 200 `list[AnimalPhotoResponse]`
  - `AnimalPhotoResponse` com `id: UUID`, `url: str`, `sort_order: int`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api/tests/test_animal_photos_api.py`:

```python
import io

import pytest

from app.main import app
from app.services.storage import get_storage


class FakeStorage:
    """Dublê do bucket. Nenhum teste toca a rede."""

    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.deleted: list[str] = []

    def save(self, data: bytes, content_type: str) -> str:
        from app.services.storage import build_storage_key

        key = build_storage_key(content_type)
        self.objects[key] = data
        return key

    def delete(self, key: str) -> None:
        self.deleted.append(key)
        self.objects.pop(key, None)

    def url(self, key: str) -> str:
        return f"https://cdn.test/{key}"


@pytest.fixture()
def storage():
    fake = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_storage, None)


def _register(client, email="ana@abrigo.org", org_name="Abrigo A"):
    resp = client.post(
        "/api/auth/register",
        json={
            "org_name": org_name,
            "city": "João Pessoa",
            "name": "Ana",
            "email": email,
            "password": "s3cret!",
        },
    )
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _animal(client, token, name="Rex"):
    return client.post(
        "/api/admin/animals", headers=_auth(token), json={"name": name, "species": "cão"}
    ).json()


def _upload(client, token, animal_id, *, content=b"fake-bytes", filename="foto.jpg", ctype="image/jpeg"):
    return client.post(
        f"/api/admin/animals/{animal_id}/photos",
        headers=_auth(token),
        files={"file": (filename, io.BytesIO(content), ctype)},
    )


@pytest.mark.parametrize(
    "ctype,filename",
    [("image/jpeg", "a.jpg"), ("image/png", "a.png"), ("image/webp", "a.webp")],
)
def test_upload_accepts_the_three_image_types(client, storage, ctype, filename):
    token = _register(client)
    animal = _animal(client, token)

    resp = _upload(client, token, animal["id"], filename=filename, ctype=ctype)

    assert resp.status_code == 201
    assert resp.json()["sort_order"] == 0
    assert len(storage.objects) == 1


def test_uploads_are_appended_at_the_end_of_the_order(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    first = _upload(client, token, animal["id"]).json()
    second = _upload(client, token, animal["id"]).json()

    assert first["sort_order"] == 0
    assert second["sort_order"] == 1


def test_upload_rejects_a_content_type_that_is_not_an_image(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    resp = _upload(client, token, animal["id"], filename="x.pdf", ctype="application/pdf")

    assert resp.status_code == 422
    assert "JPG, PNG ou WEBP" in resp.json()["detail"]
    assert storage.objects == {}


def test_upload_rejects_a_file_over_one_megabyte(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    resp = _upload(client, token, animal["id"], content=b"x" * (1_048_576 + 1))

    assert resp.status_code == 422
    assert "1 MB" in resp.json()["detail"]
    assert storage.objects == {}


def test_upload_rejects_the_fifth_photo(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    for _ in range(4):
        assert _upload(client, token, animal["id"]).status_code == 201

    resp = _upload(client, token, animal["id"])

    assert resp.status_code == 422
    assert "4 fotos" in resp.json()["detail"]
    assert len(storage.objects) == 4


def test_malicious_filename_cannot_escape_the_animals_prefix(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    _upload(client, token, animal["id"], filename="../../etc/passwd")

    key = next(iter(storage.objects))
    assert key.startswith("animals/")
    assert ".." not in key
    assert "passwd" not in key


def test_another_org_cannot_upload_to_this_animal(client, storage):
    token_a = _register(client, email="a@x.org", org_name="A")
    token_b = _register(client, email="b@x.org", org_name="B")
    animal = _animal(client, token_a)

    assert _upload(client, token_b, animal["id"]).status_code == 404
    assert storage.objects == {}


def test_another_org_cannot_delete_this_photo(client, storage):
    token_a = _register(client, email="a@x.org", org_name="A")
    token_b = _register(client, email="b@x.org", org_name="B")
    animal = _animal(client, token_a)
    photo = _upload(client, token_a, animal["id"]).json()

    resp = client.delete(
        f"/api/admin/animals/{animal['id']}/photos/{photo['id']}", headers=_auth(token_b)
    )

    assert resp.status_code == 404
    assert storage.deleted == []


def test_deleting_a_photo_removes_it_from_the_bucket_and_closes_the_gap(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    first = _upload(client, token, animal["id"]).json()
    _upload(client, token, animal["id"])

    resp = client.delete(
        f"/api/admin/animals/{animal['id']}/photos/{first['id']}", headers=_auth(token)
    )

    assert resp.status_code == 204
    assert len(storage.deleted) == 1
    # a que sobrou vira capa; ordem sem buraco
    remaining = client.get(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).json()
    assert len(remaining["photos"]) == 1
    assert remaining["photo_url"] == remaining["photos"][0]


def test_setting_a_cover_moves_it_to_the_front(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    _upload(client, token, animal["id"])
    second = _upload(client, token, animal["id"]).json()
    third = _upload(client, token, animal["id"]).json()

    resp = client.patch(
        f"/api/admin/animals/{animal['id']}/photos/{third['id']}/cover", headers=_auth(token)
    )

    assert resp.status_code == 200
    order = [p["id"] for p in resp.json()]
    assert order[0] == third["id"]
    # as outras mantêm a ordem relativa entre si
    assert order.index(second["id"]) == 2
    assert [p["sort_order"] for p in resp.json()] == [0, 1, 2]

    detail = client.get(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).json()
    assert detail["photo_url"] == detail["photos"][0]


def test_deleting_the_animal_removes_its_photos(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    _upload(client, token, animal["id"])

    assert client.delete(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).status_code == 204
    assert client.get(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).status_code == 404
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `docker compose exec -T api pytest tests/test_animal_photos_api.py -v`
Expected: FAIL — as rotas não existem, todos devolvem 404/405

- [ ] **Step 3: Criar o router**

Criar `apps/api/app/routers/animal_photos.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Animal, AnimalPhoto, User
from app.schemas.animal_photo import AnimalPhotoResponse
from app.services.storage import (
    EXTENSION_BY_CONTENT_TYPE,
    MAX_PHOTO_BYTES,
    MAX_PHOTOS_PER_ANIMAL,
    Storage,
    get_storage,
)

router = APIRouter(prefix="/api/admin/animals/{animal_id}/photos", tags=["admin:photos"])


def _get_owned_animal(animal_id: UUID, org_id: UUID, db: Session) -> Animal:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.org_id != org_id:
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    return animal


def _photos_of(animal_id: UUID, db: Session) -> list[AnimalPhoto]:
    return list(
        db.scalars(
            select(AnimalPhoto)
            .where(AnimalPhoto.animal_id == animal_id)
            .order_by(AnimalPhoto.sort_order)
        )
    )


def _renumber(photos: list[AnimalPhoto]) -> None:
    """Reescreve sort_order como 0..n-1, sem buracos.

    Buraco na sequência não quebra a ordenação, mas faz o próximo upload calcular
    uma posição errada — o append usa a contagem, não o último valor.
    """
    for position, photo in enumerate(photos):
        photo.sort_order = position


@router.post("", response_model=AnimalPhotoResponse, status_code=201)
def upload_photo(
    animal_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
) -> AnimalPhoto:
    _get_owned_animal(animal_id, current_user.org_id, db)

    if file.content_type not in EXTENSION_BY_CONTENT_TYPE:
        raise HTTPException(status_code=422, detail="A foto precisa ser JPG, PNG ou WEBP.")

    data = file.file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=422, detail="Cada foto precisa ter no máximo 1 MB.")

    existing = _photos_of(animal_id, db)
    if len(existing) >= MAX_PHOTOS_PER_ANIMAL:
        raise HTTPException(status_code=422, detail="O animal já tem 4 fotos. Remova uma antes de adicionar outra.")

    key = storage.save(data, file.content_type)
    photo = AnimalPhoto(
        animal_id=animal_id, storage_key=key, is_external=False, sort_order=len(existing)
    )
    db.add(photo)
    try:
        db.commit()
    except Exception:
        # O objeto já subiu; sem a linha no banco ele viraria lixo invisível no bucket.
        db.rollback()
        storage.delete(key)
        raise
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}", status_code=204)
def delete_photo(
    animal_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
) -> None:
    _get_owned_animal(animal_id, current_user.org_id, db)

    photo = db.get(AnimalPhoto, photo_id)
    if photo is None or photo.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    key, is_external = photo.storage_key, photo.is_external
    db.delete(photo)
    db.flush()
    _renumber(_photos_of(animal_id, db))
    db.commit()

    # Banco primeiro, bucket depois: objeto órfão é barato, registro apontando para
    # objeto inexistente quebra a página.
    if not is_external:
        storage.delete(key)


@router.patch("/{photo_id}/cover", response_model=list[AnimalPhotoResponse])
def set_cover(
    animal_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnimalPhoto]:
    _get_owned_animal(animal_id, current_user.org_id, db)

    photos = _photos_of(animal_id, db)
    target = next((p for p in photos if p.id == photo_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    # A escolhida vai para a frente; as demais mantêm a ordem relativa entre si.
    _renumber([target] + [p for p in photos if p.id != photo_id])
    db.commit()
    return _photos_of(animal_id, db)
```

- [ ] **Step 4: Registrar o router**

Em `apps/api/app/main.py`, importar `animal_photos` junto dos outros routers e acrescentar `app.include_router(animal_photos.router)` seguindo o formato das linhas que já estão lá. Registre **depois** de `animals.router`, para que `/api/admin/animals/{animal_id}` continue resolvendo primeiro.

- [ ] **Step 5: Rodar os testes**

Run: `docker compose exec -T api pytest tests/test_animal_photos_api.py -v`
Expected: PASS (14 testes, contando as três variações parametrizadas)

- [ ] **Step 6: Rodar a suíte inteira e o linter**

Run: `docker compose exec -T api pytest -q && docker compose exec -T api ruff check .`
Expected: tudo verde, ruff limpo

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/schemas/animal_photo.py apps/api/app/routers/animal_photos.py apps/api/app/main.py apps/api/tests/test_animal_photos_api.py
git commit -m "feat(api): endpoints de upload, remoção e capa das fotos"
```

---

### Task 5: Cliente de fotos no front

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/lib/adminApi.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/pages/public/AnimalPublicPage.tsx:52`
- Modify: `apps/web/src/components/public/AnimalGallery.tsx`
- Modify: `apps/web/src/components/public/AnimalGallery.test.tsx`
- Create: `apps/web/src/lib/adminApi.photos.test.ts`

**Interfaces:**
- Consumes: as três rotas da Task 4
- Produces:
  - `type AnimalPhoto = { id: string; url: string; sort_order: number }`
  - `Animal.photos: string[]`, `PublicAnimal.photos: string[]`
  - `AnimalInput` **sem** `photo_url`
  - `adminApi.uploadPhoto(animalId: string, file: File): Promise<AnimalPhoto>`
  - `adminApi.deletePhoto(animalId: string, photoId: string): Promise<void>`
  - `adminApi.setCoverPhoto(animalId: string, photoId: string): Promise<AnimalPhoto[]>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/web/src/lib/adminApi.photos.test.ts`:

```ts
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { adminApi } from "./adminApi";
import { setAuthToken } from "./api";

const ANIMAL = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  setAuthToken("token-de-teste");
});

afterEach(() => {
  setAuthToken(null);
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, status = 200) {
  const spy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

test("uploadPhoto envia multipart e deixa o navegador definir o boundary", async () => {
  const spy = mockFetch({ id: "p1", url: "https://cdn/x.jpg", sort_order: 0 });
  const file = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });

  await adminApi.uploadPhoto(ANIMAL, file);

  const [url, init] = spy.mock.calls[0];
  expect(url).toContain(`/api/admin/animals/${ANIMAL}/photos`);
  expect(init.method).toBe("POST");
  expect(init.body).toBeInstanceOf(FormData);
  // Content-Type fixo em JSON quebraria o multipart: sem boundary o servidor não parseia.
  expect(new Headers(init.headers).get("Content-Type")).toBeNull();
  // e a autenticação continua indo
  expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-de-teste");
});

test("uploadPhoto manda o arquivo no campo 'file'", async () => {
  const spy = mockFetch({ id: "p1", url: "https://cdn/x.jpg", sort_order: 0 });
  const file = new File(["conteudo"], "foto.jpg", { type: "image/jpeg" });

  await adminApi.uploadPhoto(ANIMAL, file);

  const body = spy.mock.calls[0][1].body as FormData;
  expect(body.get("file")).toBe(file);
});

test("uploadPhoto propaga a mensagem de erro da API", async () => {
  mockFetch({ detail: "A foto precisa ser JPG, PNG ou WEBP." }, 422);
  const file = new File(["x"], "a.pdf", { type: "application/pdf" });

  await expect(adminApi.uploadPhoto(ANIMAL, file)).rejects.toThrow(
    "A foto precisa ser JPG, PNG ou WEBP.",
  );
});

test("deletePhoto chama a rota certa e aceita 204 sem corpo", async () => {
  const spy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", spy);

  await expect(adminApi.deletePhoto(ANIMAL, "p1")).resolves.toBeUndefined();
  expect(spy.mock.calls[0][0]).toContain(`/api/admin/animals/${ANIMAL}/photos/p1`);
  expect(spy.mock.calls[0][1].method).toBe("DELETE");
});

test("setCoverPhoto devolve a nova ordem", async () => {
  mockFetch([
    { id: "p2", url: "https://cdn/b.jpg", sort_order: 0 },
    { id: "p1", url: "https://cdn/a.jpg", sort_order: 1 },
  ]);

  const ordered = await adminApi.setCoverPhoto(ANIMAL, "p2");

  expect(ordered.map((p) => p.id)).toEqual(["p2", "p1"]);
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd apps/web && npx vitest run src/lib/adminApi.photos.test.ts`
Expected: FAIL com `adminApi.uploadPhoto is not a function`

- [ ] **Step 3: Fazer o `apiFetch` respeitar FormData**

Em `apps/web/src/lib/api.ts`, trocar o corpo de `apiFetch` (linhas 13-30) por:

```ts
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  // Em multipart o Content-Type carrega o boundary que só o navegador sabe gerar;
  // fixá-lo em JSON faria o servidor recusar o corpo.
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!resp.ok) {
    let detail = `Request failed: ${resp.status}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  // 204 não tem corpo; chamar .json() aqui estouraria.
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}
```

- [ ] **Step 4: Acrescentar os métodos ao client**

Em `apps/web/src/lib/adminApi.ts`, incluir `AnimalPhoto` no import de `./types` e acrescentar, logo depois de `deleteAnimal`:

```ts
  // Photos
  uploadPhoto: (animalId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiFetch<AnimalPhoto>(`/api/admin/animals/${animalId}/photos`, {
      method: "POST",
      body,
    });
  },
  deletePhoto: (animalId: string, photoId: string) =>
    apiFetch<void>(`/api/admin/animals/${animalId}/photos/${photoId}`, { method: "DELETE" }),
  setCoverPhoto: (animalId: string, photoId: string) =>
    apiFetch<AnimalPhoto[]>(`/api/admin/animals/${animalId}/photos/${photoId}/cover`, {
      method: "PATCH",
    }),
```

- [ ] **Step 5: Atualizar os tipos**

Em `apps/web/src/lib/types.ts`:

```ts
export type AnimalPhoto = { id: string; url: string; sort_order: number };
```

Acrescentar `photos: string[];` a `Animal` e a `PublicAnimal` (as duas mantêm `photo_url: string | null`, que segue vindo da API como capa derivada).

Remover `photo_url` de `AnimalInput` — a foto agora entra por upload, e deixar o campo aqui criaria uma segunda fonte da verdade.

- [ ] **Step 6: Ligar a galeria pública ao novo campo**

Em `apps/web/src/pages/public/AnimalPublicPage.tsx`, linha 52, trocar:

```tsx
        <AnimalGallery photos={data.photo_url ? [data.photo_url] : []} name={data.name} />
```

por:

```tsx
        <AnimalGallery photos={data.photos} name={data.name} />
```

- [ ] **Step 7: Navegação por setas na galeria**

A spec pede setas do teclado, e a galeria só tem Tab hoje. Acrescentar a
`apps/web/src/components/public/AnimalGallery.test.tsx`:

```tsx
test("setas do teclado percorrem as fotos a partir da miniatura em foco", async () => {
  const user = userEvent.setup();
  render(<AnimalGallery photos={["a.jpg", "b.jpg", "c.jpg"]} name="Mel" />);

  screen.getByRole("button", { name: "Ver foto 1 de Mel" }).focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "b.jpg");

  await user.keyboard("{ArrowLeft}");
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "a.jpg");
});

test("as setas não passam do fim nem do começo", async () => {
  const user = userEvent.setup();
  render(<AnimalGallery photos={["a.jpg", "b.jpg"]} name="Mel" />);

  screen.getByRole("button", { name: "Ver foto 1 de Mel" }).focus();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "a.jpg");

  await user.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByTestId("gallery-main")).toHaveAttribute("src", "b.jpg");
});
```

Rodar (`npx vitest run src/components/public/AnimalGallery.test.tsx`) e confirmar que
falham. Então, em `AnimalGallery.tsx`, envolver a fileira de miniaturas num container com
o handler:

```tsx
        <div
          className="grid grid-cols-4 gap-2.5"
          role="group"
          aria-label={`Fotos de ${name}`}
          onKeyDown={(e) => {
            // Setas percorrem as fotos sem tirar o dedo do teclado; Tab continua
            // funcionando para quem prefere pular a fileira inteira.
            if (e.key === "ArrowRight") setActive((i) => Math.min(i + 1, photos.length - 1));
            else if (e.key === "ArrowLeft") setActive((i) => Math.max(i - 1, 0));
            else return;
            e.preventDefault();
          }}
        >
```

Rodar de novo e confirmar que passam.

- [ ] **Step 8: Rodar os testes e o compilador**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS. O `tsc` vai apontar `AnimalFormPage.tsx` e o mock `BASE_ANIMAL` em `AnimalFormPage.test.tsx`, que ainda usam `photo_url` no input — acrescente `photos: []` ao mock e **remova o campo "Foto (URL)"** do formulário (bloco das linhas 166-174 e o `photo_url: ""` de `EMPTY` e do `useEffect`). O redesenho completo do formulário é a Task 8; aqui só o necessário para compilar.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/pages/ apps/web/src/components/public/
git commit -m "feat(web): client de fotos, galeria por photos[] e navegação por setas"
```

---

### Task 6: Redimensionamento no navegador

**Files:**
- Create: `apps/web/src/lib/resizeImage.ts`
- Create: `apps/web/src/lib/resizeImage.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `resizeImage(file: File, maxSide?: number): Promise<File>` — `maxSide` padrão 1600
  - `MAX_IMAGE_SIDE = 1600`, `JPEG_QUALITY = 0.82`

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/web/src/lib/resizeImage.test.ts`:

```ts
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MAX_IMAGE_SIDE, resizeImage } from "./resizeImage";

/** jsdom não tem canvas nem createImageBitmap: dublamos os dois. */
function stubCanvas(sourceWidth: number, sourceHeight: number) {
  const drawn: { w: number; h: number }[] = [];

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: sourceWidth, height: sourceHeight, close: vi.fn() }),
  );

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (_img: unknown, _x: number, _y: number, w: number, h: number) => {
        drawn.push({ w, h });
      },
    }),
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type: "image/jpeg" })),
  };
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
    tag === "canvas" ? canvas : document.createElement(tag)) as typeof document.createElement);

  return { canvas, drawn };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("imagem maior que o limite é reduzida mantendo a proporção", async () => {
  const { canvas } = stubCanvas(4000, 3000);
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  await resizeImage(file);

  // lado maior vai a 1600, o menor acompanha na mesma razão
  expect(canvas.width).toBe(MAX_IMAGE_SIDE);
  expect(canvas.height).toBe(1200);
});

test("imagem em pé reduz pela altura", async () => {
  const { canvas } = stubCanvas(1500, 3000);
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  await resizeImage(file);

  expect(canvas.height).toBe(MAX_IMAGE_SIDE);
  expect(canvas.width).toBe(800);
});

test("imagem menor que o limite não é ampliada", async () => {
  const { canvas } = stubCanvas(800, 600);
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  await resizeImage(file);

  expect(canvas.width).toBe(800);
  expect(canvas.height).toBe(600);
});

test("o resultado sai como JPEG, qualquer que seja a entrada", async () => {
  stubCanvas(2000, 2000);
  const file = new File(["x"], "foto.png", { type: "image/png" });

  const out = await resizeImage(file);

  expect(out.type).toBe("image/jpeg");
  expect(out.name).toBe("foto.jpg");
});

test("se o navegador não conseguir decodificar, o arquivo original passa direto", async () => {
  // A API valida de novo do outro lado; travar o cadastro por causa disto seria pior.
  vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
  const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  const out = await resizeImage(file);

  expect(out).toBe(file);
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd apps/web && npx vitest run src/lib/resizeImage.test.ts`
Expected: FAIL com `Failed to resolve import "./resizeImage"`

- [ ] **Step 3: Escrever a implementação**

Criar `apps/web/src/lib/resizeImage.ts`:

```ts
/** Lado maior da imagem depois de reduzida. */
export const MAX_IMAGE_SIDE = 1600;

/** Qualidade do JPEG de saída: ~150-400 KB para uma foto de celular. */
export const JPEG_QUALITY = 0.82;

/**
 * Reduz e reencoda a imagem antes do envio.
 *
 * Foto de celular sai com 2-5 MB e não passaria no limite de 1 MB do bucket. Aqui ela
 * cai para a casa das centenas de KB e a vitrine carrega mais rápido. A validação no
 * servidor continua existindo como rede de segurança.
 *
 * Qualquer falha de decodificação devolve o arquivo original: quem valida de verdade
 * é a API, e travar o cadastro por causa do canvas seria pior que tentar subir.
 */
export async function resizeImage(file: File, maxSide = MAX_IMAGE_SIDE): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `cd apps/web && npx vitest run src/lib/resizeImage.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/resizeImage.ts apps/web/src/lib/resizeImage.test.ts
git commit -m "feat(web): reduz a imagem no navegador antes do upload"
```

---

### Task 7: Componente `PhotoUploader`

**Files:**
- Create: `apps/web/src/components/admin/PhotoUploader.tsx`
- Create: `apps/web/src/components/admin/PhotoUploader.test.tsx`

**Interfaces:**
- Consumes: `resizeImage` (Task 6), `MAX_PHOTOS_PER_ANIMAL` equivalente no front
- Produces:

```ts
export type UploaderPhoto = { id: string; url: string };

export type PhotoUploaderProps = {
  /** Fotos já persistidas. Vazio no formulário de criação. */
  photos: UploaderPhoto[];
  /** Arquivos escolhidos e ainda não enviados (formulário de criação). */
  pending: File[];
  onPick: (files: File[]) => void;
  onRemovePhoto: (photoId: string) => void;
  onRemovePending: (index: number) => void;
  onSetCover: (photoId: string) => void;
  disabled?: boolean;
};

export const MAX_PHOTOS = 4;
```

Regras visuais, retiradas do mockup: grade de 4 colunas, quadrados; a primeira foto leva o selo `CAPA`; toda foto tem o `✕` no canto; as que não são capa mostram a faixa "definir como capa" no rodapé; o slot vazio é tracejado com `＋ adicionar foto`; abaixo da grade, a linha de ajuda `JPG, PNG ou WEBP · até 4 fotos · redimensionadas automaticamente`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/web/src/components/admin/PhotoUploader.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { PhotoUploader } from "./PhotoUploader";

const PHOTOS = [
  { id: "p1", url: "https://cdn/a.jpg" },
  { id: "p2", url: "https://cdn/b.jpg" },
];

function setup(overrides = {}) {
  const props = {
    photos: PHOTOS,
    pending: [] as File[],
    onPick: vi.fn(),
    onRemovePhoto: vi.fn(),
    onRemovePending: vi.fn(),
    onSetCover: vi.fn(),
    ...overrides,
  };
  render(<PhotoUploader {...props} />);
  return props;
}

test("a primeira foto é marcada como capa e as outras não", () => {
  setup();
  const slots = screen.getAllByTestId("photo-slot");
  expect(slots[0]).toHaveTextContent("CAPA");
  expect(slots[1]).not.toHaveTextContent("CAPA");
});

test("só as fotos que não são capa oferecem 'definir como capa'", async () => {
  const props = setup();
  const buttons = screen.getAllByRole("button", { name: /definir como capa/i });
  expect(buttons).toHaveLength(1);

  await userEvent.click(buttons[0]);
  expect(props.onSetCover).toHaveBeenCalledWith("p2");
});

test("remover uma foto persistida avisa quem é", async () => {
  const props = setup();
  await userEvent.click(screen.getAllByRole("button", { name: /remover foto/i })[0]);
  expect(props.onRemovePhoto).toHaveBeenCalledWith("p1");
});

test("o slot de adicionar some quando já há 4 fotos", () => {
  setup({
    photos: [
      { id: "p1", url: "a" },
      { id: "p2", url: "b" },
      { id: "p3", url: "c" },
      { id: "p4", url: "d" },
    ],
  });
  expect(screen.queryByLabelText("Adicionar foto")).not.toBeInTheDocument();
});

test("escolher um arquivo entrega a versão reduzida, não o original", async () => {
  const props = setup({ photos: [] });
  const original = new File(["conteudo-grande"], "foto.png", { type: "image/png" });

  await userEvent.upload(screen.getByLabelText("Adicionar foto"), original);

  await waitFor(() => expect(props.onPick).toHaveBeenCalled());
  const [entregues] = props.onPick.mock.calls[0];
  // resizeImage reencoda em JPEG; se viesse o original, o type seria image/png
  expect(entregues[0].type).toBe("image/jpeg");
});

test("recusa a quinta foto antes de chamar a API e diz por quê", async () => {
  const props = setup({ photos: [{ id: "p1", url: "a" }, { id: "p2", url: "b" }, { id: "p3", url: "c" }] });

  const arquivos = [
    new File(["a"], "1.jpg", { type: "image/jpeg" }),
    new File(["b"], "2.jpg", { type: "image/jpeg" }),
  ];
  await userEvent.upload(screen.getByLabelText("Adicionar foto"), arquivos);

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("até 4 fotos"));
  // a que cabia passou; a que não cabia foi barrada
  expect(props.onPick).toHaveBeenCalledTimes(1);
  expect(props.onPick.mock.calls[0][0]).toHaveLength(1);
});

test("recusa um arquivo que não é imagem aceita", async () => {
  const props = setup({ photos: [] });
  const pdf = new File(["x"], "doc.pdf", { type: "application/pdf" });

  await userEvent.upload(screen.getByLabelText("Adicionar foto"), pdf);

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("JPG, PNG ou WEBP"));
  expect(props.onPick).not.toHaveBeenCalled();
});

test("arquivos pendentes aparecem junto com os persistidos e podem ser removidos", async () => {
  const pending = [new File(["a"], "novo.jpg", { type: "image/jpeg" })];
  const props = setup({ photos: [{ id: "p1", url: "a" }], pending });

  expect(screen.getAllByTestId("photo-slot")).toHaveLength(2);
  await userEvent.click(screen.getAllByRole("button", { name: /remover foto/i })[1]);
  expect(props.onRemovePending).toHaveBeenCalledWith(0);
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd apps/web && npx vitest run src/components/admin/PhotoUploader.test.tsx`
Expected: FAIL com `Failed to resolve import "./PhotoUploader"`

- [ ] **Step 3: Escrever o componente**

Criar `apps/web/src/components/admin/PhotoUploader.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { resizeImage } from "@/lib/resizeImage";
import { cn } from "@/lib/utils";

export type UploaderPhoto = { id: string; url: string };

/** Capa + 3. Mesmo limite validado na API. */
export const MAX_PHOTOS = 4;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export type PhotoUploaderProps = {
  photos: UploaderPhoto[];
  pending: File[];
  onPick: (files: File[]) => void;
  onRemovePhoto: (photoId: string) => void;
  onRemovePending: (index: number) => void;
  onSetCover: (photoId: string) => void;
  disabled?: boolean;
};

export function PhotoUploader({
  photos,
  pending,
  onPick,
  onRemovePhoto,
  onRemovePending,
  onSetCover,
  disabled,
}: PhotoUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // URLs de preview dos arquivos ainda não enviados. Revogadas na limpeza para não
  // vazar memória enquanto a ONG troca de foto várias vezes.
  const previews = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const total = photos.length + pending.length;

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    // Permite reescolher o mesmo arquivo depois de removê-lo.
    e.target.value = "";
    if (chosen.length === 0) return;

    setError(null);

    const validos = chosen.filter((f) => ACCEPTED.includes(f.type));
    if (validos.length < chosen.length) {
      setError("A foto precisa ser JPG, PNG ou WEBP.");
    }

    const cabem = validos.slice(0, MAX_PHOTOS - total);
    if (cabem.length < validos.length) {
      setError(`São até 4 fotos por animal. Remova uma antes de adicionar outra.`);
    }
    if (cabem.length === 0) return;

    onPick(await Promise.all(cabem.map((f) => resizeImage(f))));
  }

  const slots = [
    ...photos.map((p, i) => ({
      key: p.id,
      src: p.url,
      cover: i === 0,
      onRemove: () => onRemovePhoto(p.id),
      onCover: i === 0 ? undefined : () => onSetCover(p.id),
    })),
    ...pending.map((f, i) => ({
      key: `pending-${i}`,
      src: previews[i],
      cover: photos.length === 0 && i === 0,
      onRemove: () => onRemovePending(i),
      onCover: undefined,
    })),
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2.5">
        {slots.map((slot) => (
          <div
            key={slot.key}
            data-testid="photo-slot"
            className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
          >
            <img src={slot.src} alt="" className="h-full w-full object-cover" />
            {slot.cover && (
              <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                CAPA
              </span>
            )}
            <button
              type="button"
              aria-label="Remover foto"
              disabled={disabled}
              onClick={slot.onRemove}
              className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900/60 text-xs text-white"
            >
              <span aria-hidden="true">✕</span>
            </button>
            {slot.onCover && (
              <button
                type="button"
                disabled={disabled}
                onClick={slot.onCover}
                className="absolute inset-x-0 bottom-0 border-t border-border bg-white/95 py-0.5 text-[10.5px] font-semibold text-primary"
              >
                definir como capa
              </button>
            )}
          </div>
        ))}

        {total < MAX_PHOTOS && (
          <label
            className={cn(
              "grid aspect-square cursor-pointer place-items-center gap-0.5 rounded-md border border-dashed border-slate-300 bg-background text-center text-[11.5px] font-semibold text-muted-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <span aria-hidden="true" className="text-lg">＋</span>
            adicionar foto
            <input
              ref={inputRef}
              type="file"
              aria-label="Adicionar foto"
              accept={ACCEPTED.join(",")}
              multiple
              disabled={disabled}
              onChange={handleChange}
              className="sr-only"
            />
          </label>
        )}
      </div>

      <span className="font-mono text-[11.5px] text-muted-foreground">
        JPG, PNG ou WEBP · até 4 fotos · redimensionadas automaticamente
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Rodar os testes**

Run: `cd apps/web && npx vitest run src/components/admin/PhotoUploader.test.tsx`
Expected: PASS (8 testes)

Se `URL.createObjectURL` estourar, é o jsdom, que não a implementa. Nesse caso acrescente ao topo do arquivo de teste:

```ts
vi.stubGlobal("URL", Object.assign(URL, {
  createObjectURL: () => "blob:preview",
  revokeObjectURL: () => {},
}));
```

- [ ] **Step 5: Rodar a suíte inteira e o compilador**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: tudo verde

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/
git commit -m "feat(web): uploader de fotos com capa, remoção e limite de 4"
```

---

### Task 8: Formulário do animal no layout do mockup

**Files:**
- Create: `apps/web/src/components/shadcn/textarea.tsx`
- Modify: `apps/web/src/pages/admin/AnimalFormPage.tsx`
- Modify: `apps/web/src/pages/admin/AnimalFormPage.test.tsx`

**Interfaces:**
- Consumes: `PhotoUploader` (Task 7), `adminApi.uploadPhoto` / `deletePhoto` / `setCoverPhoto` (Task 5)
- Produces: `Textarea` em `@/components/shadcn/textarea`

**Layout, do mockup:**

- Cabeçalho: título à esquerda, `Cancelar` (secundário) e `Salvar` (primário) à direita, na mesma linha
- Card único com grid de 2 colunas, `gap-4`:
  - `Nome` — largura total
  - `Espécie` | `Raça`
  - `Sexo` | `Porte`
  - `Idade estimada` | `Situação`
  - `Descrição` — largura total, `Textarea`
  - `Fotos` — largura total, `PhotoUploader`
- O campo "Foto (URL)" deixa de existir

**Fluxo de criação:** os arquivos ficam retidos em `pending`; o `POST /animals` cria o animal e, com o id na mão, os uploads disparam em seguida. Se algum falhar, o animal **não** é desfeito: o formulário passa a editar o animal recém-criado e mostra um alerta com o número de fotos que não subiram e um botão para tentar de novo.

- [ ] **Step 1: Escrever o teste que falha**

Substituir o conteúdo de `apps/web/src/pages/admin/AnimalFormPage.test.tsx` mantendo os dois testes que já existem (sentinela de Sexo/Porte) — eles seguem válidos — e acrescentando `photos: []` ao `BASE_ANIMAL`. Depois acrescentar:

```tsx
test("as ações ficam no cabeçalho, não no rodapé do formulário", async () => {
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

  const header = await screen.findByTestId("form-header");
  expect(within(header).getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  expect(within(header).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
});

test("não existe mais campo de URL de foto", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText(/foto \(url\)/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Adicionar foto")).toBeInTheDocument();
});

test("descrição é um textarea, não um input de uma linha", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("Descrição").tagName).toBe("TEXTAREA");
});

test("criar animal com fotos: cria primeiro, depois sobe as fotos com o id em mãos", async () => {
  const user = userEvent.setup();
  const createSpy = vi.spyOn(adminApi, "createAnimal").mockResolvedValue(BASE_ANIMAL);
  const uploadSpy = vi
    .spyOn(adminApi, "uploadPhoto")
    .mockResolvedValue({ id: "p1", url: "https://cdn/a.jpg", sort_order: 0 });

  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
        <Route path="/admin/animais" element={<p>lista de animais</p>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Nome"), "Fido");
  await user.upload(
    screen.getByLabelText("Adicionar foto"),
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
  );
  await screen.findByTestId("photo-slot");

  await user.click(screen.getByRole("button", { name: "Salvar" }));

  await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
  expect(createSpy).toHaveBeenCalled();
  expect(uploadSpy.mock.calls[0][0]).toBe(BASE_ANIMAL.id);
  // ordem importa: sem o id do animal não há para onde subir a foto
  expect(createSpy.mock.invocationCallOrder[0]).toBeLessThan(
    uploadSpy.mock.invocationCallOrder[0],
  );
});

test("falha no upload não desfaz o animal e oferece tentar de novo", async () => {
  const user = userEvent.setup();
  const deleteSpy = vi.spyOn(adminApi, "deleteAnimal").mockResolvedValue(undefined);
  vi.spyOn(adminApi, "createAnimal").mockResolvedValue(BASE_ANIMAL);
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  const uploadSpy = vi
    .spyOn(adminApi, "uploadPhoto")
    .mockRejectedValueOnce(new Error("Cada foto precisa ter no máximo 1 MB."));

  render(
    <MemoryRouter initialEntries={["/admin/animais/novo"]}>
      <Routes>
        <Route path="/admin/animais/novo" element={<AnimalFormPage />} />
        <Route path="/admin/animais" element={<p>lista de animais</p>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Nome"), "Fido");
  await user.upload(
    screen.getByLabelText("Adicionar foto"),
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
  );
  await screen.findByTestId("photo-slot");
  await user.click(screen.getByRole("button", { name: "Salvar" }));

  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent("1 foto não subiu");
  // o animal continua de pé
  expect(deleteSpy).not.toHaveBeenCalled();
  // e ainda estamos no formulário, não na lista
  expect(screen.queryByText("lista de animais")).not.toBeInTheDocument();

  uploadSpy.mockResolvedValueOnce({ id: "p1", url: "https://cdn/a.jpg", sort_order: 0 });
  await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

test("editar animal existente: remover foto chama a API na hora", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue({
    ...BASE_ANIMAL,
    photos: ["https://cdn/a.jpg"],
    photo_url: "https://cdn/a.jpg",
  });
  const deletePhotoSpy = vi.spyOn(adminApi, "deletePhoto").mockResolvedValue(undefined);

  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole("button", { name: /remover foto/i }));

  await waitFor(() => expect(deletePhotoSpy).toHaveBeenCalled());
});
```

E mais um, para o erro que vem da API durante a edição — o `PhotoUploader` valida tipo e quantidade sozinho, mas a mensagem do servidor tem de aparecer também:

```tsx
test("erro de upload vindo da API aparece na tela, sem derrubar o formulário", async () => {
  const user = userEvent.setup();
  vi.spyOn(adminApi, "getAnimal").mockResolvedValue(BASE_ANIMAL);
  vi.spyOn(adminApi, "uploadPhoto").mockRejectedValue(
    new Error("Cada foto precisa ter no máximo 1 MB."),
  );

  render(
    <MemoryRouter initialEntries={[`/admin/animais/${BASE_ANIMAL.id}/editar`]}>
      <Routes>
        <Route path="/admin/animais/:id/editar" element={<AnimalFormPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.upload(
    await screen.findByLabelText("Adicionar foto"),
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("no máximo 1 MB");
  // o resto do formulário continua utilizável
  expect(screen.getByLabelText("Nome")).toHaveValue("Rex");
});
```

Acrescentar `within` ao import de `@testing-library/react`.

**Sobre os ids das fotos:** `Animal.photos` é `string[]` (URLs) e não serve para remover nem trocar a capa. Use `Animal.photo_items`, que a Task 3 acrescentou ao `AnimalResponse` justamente para isto. Em `apps/web/src/lib/types.ts`, `Animal` ganha `photo_items: AnimalPhoto[]` — só `Animal`, não `PublicAnimal`.

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `cd apps/web && npx vitest run src/pages/admin/AnimalFormPage.test.tsx`
Expected: FAIL — não há `form-header`, nem textarea, nem uploader

- [ ] **Step 3: Criar o Textarea shadcn**

Criar `apps/web/src/components/shadcn/textarea.tsx`, espelhando `input.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
```

Confira as classes de `input.tsx` antes de escrever e use exatamente as mesmas para borda, foco e disabled — os dois campos aparecem lado a lado no mesmo formulário e qualquer divergência salta aos olhos.

- [ ] **Step 4: Reescrever o formulário**

Reescrever `apps/web/src/pages/admin/AnimalFormPage.tsx`. Pontos obrigatórios:

- imports: sai `Card` de `../../components/ui/Card`, sai `Alert` de `../../components/ui/Alert`, sai `styles from "./admin.module.css"`; entram `Card` de `@/components/shadcn/card`, `Textarea` de `@/components/shadcn/textarea`, `PhotoUploader` de `@/components/admin/PhotoUploader`
- `EMPTY` perde `photo_url`
- estado novo: `photos: AnimalPhoto[]` (persistidas), `pending: File[]` (retidas), `failed: File[]` (as que não subiram), `createdId: string | null`
- `const animalId = id ?? createdId` — depois de criar, o formulário passa a editar
- cabeçalho:

```tsx
      <div data-testid="form-header" className="mb-5 flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          {editing ? `Editar ${form.name || "animal"}` : "Novo animal"}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/animais")}>
            Cancelar
          </Button>
          <Button type="submit" form="animal-form" disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
```

O `form="animal-form"` é o que permite o botão viver fora do `<form>`; o `<form>` precisa do `id="animal-form"` correspondente.

- grade: `<div className="grid grid-cols-2 gap-4">`, com `className="col-span-2"` nos blocos de Nome, Descrição e Fotos. A ordem dos campos é a da seção "Layout" acima.
- upload das retidas, depois de criar:

```tsx
  /** Sobe os arquivos retidos. Devolve os que falharam — o animal já existe e fica. */
  async function uploadPending(targetId: string, files: File[]): Promise<File[]> {
    const naoSubiram: File[] = [];
    for (const file of files) {
      try {
        await adminApi.uploadPhoto(targetId, file);
      } catch {
        naoSubiram.push(file);
      }
    }
    return naoSubiram;
  }
```

- no `onSubmit`, no ramo de criação:

```tsx
        const criado = await adminApi.createAnimal(payload);
        const naoSubiram = pending.length ? await uploadPending(criado.id, pending) : [];
        if (naoSubiram.length) {
          // Desfazer o animal por causa de uma foto seria pior: o cadastro fica,
          // o alerta diz o que faltou e o botão tenta de novo.
          setCreatedId(criado.id);
          setPending([]);
          setFailed(naoSubiram);
          return;
        }
        navigate("/admin/animais");
```

- o alerta de falha parcial, renderizado acima do card:

```tsx
      {failed.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <span>
            O animal foi salvo, mas {failed.length === 1 ? "1 foto não subiu" : `${failed.length} fotos não subiram`}.
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={retryFailed}>
            Tentar novamente
          </Button>
        </div>
      )}
```

```tsx
  async function retryFailed() {
    if (!animalId) return;
    const aindaFalham = await uploadPending(animalId, failed);
    setFailed(aindaFalham);
    if (aindaFalham.length === 0) await reloadPhotos(animalId);
  }
```

- em modo edição, as ações de foto valem na hora (não esperam o Salvar):

```tsx
  async function reloadPhotos(targetId: string) {
    const atual = await adminApi.getAnimal(targetId);
    setPhotos(atual.photo_items);
  }

  async function handleRemovePhoto(photoId: string) {
    if (!animalId) return;
    await adminApi.deletePhoto(animalId, photoId);
    await reloadPhotos(animalId);
  }

  async function handleSetCover(photoId: string) {
    if (!animalId) return;
    setPhotos(await adminApi.setCoverPhoto(animalId, photoId));
  }
```

- `onPick`: quando já existe `animalId`, sobe na hora e recarrega; senão, acumula em `pending`.

- [ ] **Step 5: Rodar os testes do formulário**

Run: `cd apps/web && npx vitest run src/pages/admin/AnimalFormPage.test.tsx`
Expected: PASS (9 testes — os 2 antigos de sentinela mais os 7 novos)

- [ ] **Step 6: Rodar tudo — front e back**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Run: `docker compose exec -T api pytest -q && docker compose exec -T api ruff check .`
Expected: tudo verde nos dois lados

- [ ] **Step 7: Verificar que o CSS legado não ficou órfão**

Run: `grep -rn "admin.module.css" apps/web/src`
Se `AnimalFormPage` era o último consumidor de `.grid2` ou `.rowActions`, remova essas duas regras de `admin.module.css`. Não remova as demais — outras páginas do admin ainda usam o arquivo.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/shadcn/textarea.tsx apps/web/src/pages/admin/ apps/web/src/lib/types.ts apps/api/app/schemas/animal.py apps/api/tests/
git commit -m "feat(web): formulário do animal no layout do mockup com uploader"
```

---

## Verificação final

Depois da Task 8, com os containers de pé:

```bash
docker compose exec -T api pytest -q
docker compose exec -T api ruff check .
cd apps/web && npx vitest run && npx tsc --noEmit -p tsconfig.app.json
```

**O que exige olho humano e navegador — nenhum teste acima cobre:**

1. Subir uma foto de verdade pelo formulário e confirmar que ela aparece na vitrine, na página do animal e no bucket do Supabase. Este é o único momento em que o `S3Storage` roda de fato: todos os testes usam o dublê.
2. Trocar a capa e conferir que o `AnimalCard` da vitrine passa a mostrar a nova.
3. Conferir que a grade de 4 slots não quebra em tela estreita.
4. Rodar a migration contra o banco de produção do Railway **depois** do merge, e confirmar que as fotos legadas (se houver) viraram linhas `is_external`.
