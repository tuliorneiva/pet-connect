from dataclasses import dataclass
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Medication, Vaccination


@dataclass(frozen=True)
class HealthStatus:
    """Sinais públicos de saúde. Sem datas nem nome de doença — o adotante
    precisa de confiança, não de prontuário."""

    vaccines_up_to_date: bool | None
    under_treatment: bool


def compute_health_status(
    db: Session, animal_id: UUID, today: date | None = None
) -> HealthStatus:
    today = today or date.today()

    total_vaccines = db.scalar(
        select(Vaccination).where(Vaccination.animal_id == animal_id).limit(1)
    )
    if total_vaccines is None:
        up_to_date: bool | None = None
    else:
        overdue = db.scalar(
            select(Vaccination)
            .where(
                Vaccination.animal_id == animal_id,
                Vaccination.applied_at.is_(None),
                Vaccination.due_at.is_not(None),
                Vaccination.due_at < today,
            )
            .limit(1)
        )
        up_to_date = overdue is None

    active_med = db.scalar(
        select(Medication)
        .where(Medication.animal_id == animal_id, Medication.status == "ativa")
        .limit(1)
    )

    return HealthStatus(vaccines_up_to_date=up_to_date, under_treatment=active_med is not None)
