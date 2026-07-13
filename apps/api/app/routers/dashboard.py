from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Animal, SupportRequest, User
from app.schemas.health import AlertItem
from app.services.alerts import compute_alerts

router = APIRouter(prefix="/api/admin/dashboard", tags=["admin:dashboard"])


@router.get("/alerts", response_model=list[AlertItem])
def dashboard_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AlertItem]:
    return compute_alerts(db, current_user.org_id)


@router.get("/summary")
def dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    org_id = current_user.org_id

    def count(stmt) -> int:
        return db.scalar(stmt) or 0

    total = count(select(func.count()).select_from(Animal).where(Animal.org_id == org_id))
    available = count(
        select(func.count()).select_from(Animal).where(
            Animal.org_id == org_id, Animal.status == "disponível"
        )
    )
    adopted = count(
        select(func.count()).select_from(Animal).where(
            Animal.org_id == org_id, Animal.status == "adotado"
        )
    )
    new_requests = count(
        select(func.count()).select_from(SupportRequest).where(
            SupportRequest.org_id == org_id, SupportRequest.status == "nova"
        )
    )
    alerts = len(compute_alerts(db, org_id))
    return {
        "animals_total": total,
        "animals_available": available,
        "animals_adopted": adopted,
        "new_requests": new_requests,
        "alerts": alerts,
    }
