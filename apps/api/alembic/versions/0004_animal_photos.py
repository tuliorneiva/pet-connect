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
