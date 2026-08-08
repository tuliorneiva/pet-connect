import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.animal_photo import AnimalPhoto
    from app.models.organization import Organization


class Animal(Base):
    __tablename__ = "animal"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organization.id"))
    name: Mapped[str] = mapped_column(String(120))
    species: Mapped[str] = mapped_column(String(20))  # cão / gato / outro
    breed: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sex: Mapped[str | None] = mapped_column(String(10), nullable=True)  # macho / fêmea
    size: Mapped[str | None] = mapped_column(String(2), nullable=True)  # P / M / G
    birth_estimate: Mapped[str | None] = mapped_column(String(60), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="disponível")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    organization: Mapped["Organization"] = relationship("Organization", lazy="joined")
    photos: Mapped[list["AnimalPhoto"]] = relationship(
        "AnimalPhoto",
        # Ordenar aqui evita que cada consumidor tenha de lembrar qual é a capa.
        order_by="AnimalPhoto.sort_order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
