"""organization pix key

Revision ID: 0007_organization_pix_key
Revises: 0006_organization_social_links
Create Date: 2026-08-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_organization_pix_key"
down_revision = "0006_organization_social_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organization", sa.Column("pix_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("organization", "pix_key")
