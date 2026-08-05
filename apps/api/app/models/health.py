import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Registros de saúde só fazem sentido junto do animal: ON DELETE CASCADE no banco
# faz o Postgres limpá-los sozinho quando o animal é removido.
_ANIMAL_FK = ForeignKey("animal.id", ondelete="CASCADE")


class Vaccination(Base):
    __tablename__ = "vaccination"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    animal_id: Mapped[uuid.UUID] = mapped_column(Uuid, _ANIMAL_FK)
    vaccine_name: Mapped[str] = mapped_column(String(120))
    applied_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Medication(Base):
    __tablename__ = "medication"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    animal_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("animal.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    dosage: Mapped[str | None] = mapped_column(String(120), nullable=True)
    start_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_dose_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ativa")  # ativa / concluída
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class MedicalRecord(Base):
    __tablename__ = "medical_record"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    animal_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("animal.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id"), nullable=True
    )
