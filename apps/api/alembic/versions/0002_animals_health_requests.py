"""animals, health, and support requests

Revision ID: 0002_animals_health
Revises: b97758a7fcd5
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_animals_health"
down_revision = "b97758a7fcd5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "animal",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.Integer(), sa.ForeignKey("organization.id"), nullable=False),
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
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animal.id"), nullable=False),
        sa.Column("vaccine_name", sa.String(length=120), nullable=False),
        sa.Column("applied_at", sa.Date(), nullable=True),
        sa.Column("due_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "medication",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animal.id"), nullable=False),
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
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animal.id"), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("recorded_at", sa.Date(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
    )

    op.create_table(
        "support_request",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animal.id"), nullable=False),
        sa.Column("org_id", sa.Integer(), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("requester_name", sa.String(length=160), nullable=False),
        sa.Column("requester_email", sa.String(length=255), nullable=False),
        sa.Column("requester_phone", sa.String(length=40), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="nova"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("support_request")
    op.drop_table("medical_record")
    op.drop_table("medication")
    op.drop_table("vaccination")
    op.drop_table("animal")
