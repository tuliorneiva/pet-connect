from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Organization, User
from app.schemas.organization import OrganizationAdminResponse, OrganizationUpdate
from app.services.storage import (
    EXTENSION_BY_CONTENT_TYPE,
    MAX_PHOTO_BYTES,
    Storage,
    get_storage,
)

router = APIRouter(prefix="/api/admin/organization", tags=["admin:organization"])


def _get_org(current_user: User, db: Session) -> Organization:
    org = db.get(Organization, current_user.org_id)
    if org is None:
        # Não deveria acontecer — todo User tem org_id de uma FK válida — mas um 500
        # aqui seria mais confuso do que um 404 se o dado ficar inconsistente.
        raise HTTPException(status_code=404, detail="Organização não encontrada")
    return org


@router.get("", response_model=OrganizationAdminResponse)
def get_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    return _get_org(current_user, db)


@router.patch("", response_model=OrganizationAdminResponse)
def update_organization(
    payload: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    org = _get_org(current_user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return org


@router.post("/logo", response_model=OrganizationAdminResponse)
def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
) -> Organization:
    org = _get_org(current_user, db)

    if file.content_type not in EXTENSION_BY_CONTENT_TYPE:
        raise HTTPException(status_code=422, detail="A logo precisa ser JPG, PNG ou WEBP.")

    data = file.file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=422, detail="A logo precisa ter no máximo 1 MB.")

    key = storage.save(data, file.content_type, folder="orgs")
    # A logo antiga (se era nossa, não um link externo herdado do seed) vira lixo
    # órfão no bucket — barato e sem risco, ao contrário de apagar antes de saber
    # que a nova subiu com sucesso.
    org.logo_url = storage.url(key)
    db.commit()
    db.refresh(org)
    return org


@router.delete("/logo", response_model=OrganizationAdminResponse)
def delete_logo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    org = _get_org(current_user, db)
    org.logo_url = None
    db.commit()
    db.refresh(org)
    return org
