"""organization social links (whatsapp, instagram, facebook)

Revision ID: 0006_organization_social_links
Revises: 0004_animal_photos
Create Date: 2026-08-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_organization_social_links"
down_revision = "0004_animal_photos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organization", sa.Column("whatsapp", sa.String(length=40), nullable=True))
    op.add_column("organization", sa.Column("instagram", sa.String(length=255), nullable=True))
    op.add_column("organization", sa.Column("facebook", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("organization", "facebook")
    op.drop_column("organization", "instagram")
    op.drop_column("organization", "whatsapp")
