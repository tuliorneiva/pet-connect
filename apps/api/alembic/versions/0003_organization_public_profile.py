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
