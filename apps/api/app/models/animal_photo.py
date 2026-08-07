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
