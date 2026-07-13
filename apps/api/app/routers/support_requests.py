from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import SupportRequest, User
from app.schemas.support_request import SupportRequestResponse, SupportRequestUpdate

router = APIRouter(prefix="/api/admin/support-requests", tags=["admin:support-requests"])


@router.get("", response_model=list[SupportRequestResponse])
def list_support_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SupportRequest]:
    return list(
        db.scalars(
            select(SupportRequest)
            .where(SupportRequest.org_id == current_user.org_id)
            .order_by(SupportRequest.created_at.desc())
        )
    )


@router.patch("/{request_id}", response_model=SupportRequestResponse)
def update_support_request(
    request_id: int,
    payload: SupportRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupportRequest:
    request = db.get(SupportRequest, request_id)
    if request is None or request.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    request.status = payload.status
    db.commit()
    db.refresh(request)
    return request
