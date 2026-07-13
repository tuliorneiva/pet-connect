from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Animal, Medication, Vaccination
from app.schemas.health import AlertItem

# How many days ahead a not-yet-applied vaccine counts as "pendente".
UPCOMING_WINDOW_DAYS = 7


def compute_alerts(db: Session, org_id: int, today: date | None = None) -> list[AlertItem]:
    """Vaccines due/overdue and medications with an overdue next dose, for one ONG."""
    today = today or date.today()
    horizon = today + timedelta(days=UPCOMING_WINDOW_DAYS)
    alerts: list[AlertItem] = []

    vacc_rows = db.execute(
        select(Vaccination, Animal.name, Animal.id)
        .join(Animal, Vaccination.animal_id == Animal.id)
        .where(
            Animal.org_id == org_id,
            Vaccination.applied_at.is_(None),
            Vaccination.due_at.is_not(None),
            Vaccination.due_at <= horizon,
        )
    ).all()
    for vacc, animal_name, animal_id in vacc_rows:
        level = "atrasado" if vacc.due_at < today else "pendente"
        alerts.append(
            AlertItem(
                animal_id=animal_id,
                animal_name=animal_name,
                kind="vacina",
                description=f"Vacina {vacc.vaccine_name}",
                level=level,
                due_at=vacc.due_at,
            )
        )

    med_rows = db.execute(
        select(Medication, Animal.name, Animal.id)
        .join(Animal, Medication.animal_id == Animal.id)
        .where(
            Animal.org_id == org_id,
            Medication.status == "ativa",
            Medication.next_dose_at.is_not(None),
            Medication.next_dose_at <= today,
        )
    ).all()
    for med, animal_name, animal_id in med_rows:
        alerts.append(
            AlertItem(
                animal_id=animal_id,
                animal_name=animal_name,
                kind="medicação",
                description=f"Dose de {med.name}",
                level="atrasado",
                due_at=med.next_dose_at,
            )
        )

    alerts.sort(key=lambda a: (a.level != "atrasado", a.due_at or today))
    return alerts
