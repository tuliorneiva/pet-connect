from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.organization import Organization


class Animal(Base):
    __tablename__ = "animal"

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    name: Mapped[str] = mapped_column(String(120))
    species: Mapped[str] = mapped_column(String(20))  # cão / gato / outro
    breed: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sex: Mapped[str | None] = mapped_column(String(10), nullable=True)  # macho / fêmea
    size: Mapped[str | None] = mapped_column(String(2), nullable=True)  # P / M / G
    birth_estimate: Mapped[str | None] = mapped_column(String(60), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="disponível")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    organization: Mapped["Organization"] = relationship("Organization", lazy="joined")
