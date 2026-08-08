"""fix legacy integer ids left behind by an in-place edit of 0001 and 0002

Commit 73b7a45 ("migra IDs para UUID") edited migrations `0001_organization_user`
and `0002_animals_health_requests` *after* they had already run in production —
it should have added a new migration instead. Its own message says "sem dado em
produção" (no data in production), which was true, but rewriting an
already-applied migration file doesn't change a database that already ran it:
only environments that hadn't migrated yet (a fresh install) got the new
`Uuid` columns. Production kept the original `Integer` schema under the same
revision ids, which broke `0005_animal_photos` (UUID FK against an Integer
`animal.id`).

This drops and recreates every table from that lineage — `organization` and
`user` (0001) down through `animal`, `vaccination`, `medication`,
`medical_record` and `support_request` (0002) — with the correct types.
`organization` is recreated with the columns `0003` added too, since dropping
it would otherwise lose them. The guard below refuses to run if it finds any
real row, so this can never silently discard actual data.

Revision ID: 0004_fix_legacy_ids
Revises: 0003_organization_public_profile
Create Date: 2026-08-08
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_fix_legacy_ids"
down_revision = "0003_organization_public_profile"
branch_labels = None
depends_on = None

# Ordem de DROP: filhos antes dos pais (CASCADE cobre o resto, isto é só clareza).
_LEGACY_TABLES = (
    "support_request",
    "medical_record",
    "medication",
    "vaccination",
    "animal",
    "user",
    "organization",
)


def _assert_empty(conn) -> None:
    for table in _LEGACY_TABLES:
        exists = conn.execute(sa.text("SELECT to_regclass(:name)"), {"name": table}).scalar()
        if exists is None:
            continue
        count = conn.execute(sa.text(f'SELECT count(*) FROM "{table}"')).scalar()
        if count:
            raise RuntimeError(
                f"'{table}' tem {count} linha(s) — recusando recriar a tabela. "
                "Esta migração só é segura contra o schema legado vazio; "
                "se há dado real aqui, ele precisa de uma migração de dados "
                "de verdade (ALTER + conversão), não um drop/create."
            )


def upgrade() -> None:
    conn = op.get_bind()
    _assert_empty(conn)

    quoted = ", ".join(f'"{t}"' for t in _LEGACY_TABLES)
    op.execute(f"DROP TABLE IF EXISTS {quoted} CASCADE")

    op.create_table(
        "organization",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), unique=True, nullable=False),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # Colunas que a 0003 adicionou — precisam voltar junto, já que a tabela
        # está sendo recriada do zero.
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("founded_year", sa.Integer(), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
    )

    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "animal",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("species", sa.String(length=20), nullable=False),
        sa.Column("breed", sa.String(length=120), nullable=True),
        sa.Column("sex", sa.String(length=10), nullable=True),
        sa.Column("size", sa.String(length=2), nullable=True),
        sa.Column("birth_estimate", sa.String(length=60), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="disponível"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "vaccination",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "animal_id", sa.Uuid(), sa.ForeignKey("animal.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("vaccine_name", sa.String(length=120), nullable=False),
        sa.Column("applied_at", sa.Date(), nullable=True),
        sa.Column("due_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "medication",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "animal_id", sa.Uuid(), sa.ForeignKey("animal.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("dosage", sa.String(length=120), nullable=True),
        sa.Column("start_at", sa.Date(), nullable=True),
        sa.Column("end_at", sa.Date(), nullable=True),
        sa.Column("next_dose_at", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ativa"),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "medical_record",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "animal_id", sa.Uuid(), sa.ForeignKey("animal.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("recorded_at", sa.Date(), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("user.id"), nullable=True),
    )

    op.create_table(
        "support_request",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "animal_id", sa.Uuid(), sa.ForeignKey("animal.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("animal_name", sa.String(length=120), nullable=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("requester_name", sa.String(length=160), nullable=False),
        sa.Column("requester_email", sa.String(length=255), nullable=False),
        sa.Column("requester_phone", sa.String(length=40), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="nova"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    # Não há como voltar ao schema Integer legado (e não faria sentido). Downgrade
    # aqui só desfaz o que esta migração criou.
    quoted = ", ".join(f'"{t}"' for t in _LEGACY_TABLES)
    op.execute(f"DROP TABLE IF EXISTS {quoted} CASCADE")
