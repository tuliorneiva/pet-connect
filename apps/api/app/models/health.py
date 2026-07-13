from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Vaccination(Base):
    __tablename__ = "vaccination"

    id: Mapped[int] = mapped_column(primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    vaccine_name: Mapped[str] = mapped_column(String(120))
    applied_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Medication(Base):
    __tablename__ = "medication"

    id: Mapped[int] = mapped_column(primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    name: Mapped[str] = mapped_column(String(120))
    dosage: Mapped[str | None] = mapped_column(String(120), nullable=True)
    start_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_dose_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ativa")  # ativa / concluída
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class MedicalRecord(Base):
    __tablename__ = "medical_record"

    id: Mapped[int] = mapped_column(primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True)
