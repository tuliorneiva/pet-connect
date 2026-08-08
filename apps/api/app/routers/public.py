from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Animal, Organization, SupportRequest
from app.schemas.animal import PublicAnimalListResponse, PublicAnimalResponse
from app.schemas.organization import PublicOrganizationResponse
from app.schemas.support_request import SupportRequestCreate, SupportRequestResponse
from app.services.health_status import compute_health_status

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/animals", response_model=list[PublicAnimalListResponse])
def list_public_animals(
    species: str | None = None,
    size: str | None = None,
    sex: str | None = None,
    city: str | None = None,
    org: str | None = None,
    db: Session = Depends(get_db),
) -> list[Animal]:
    stmt = select(Animal).where(Animal.status == "disponível")
    if species:
        stmt = stmt.where(Animal.species == species)
    if size:
        stmt = stmt.where(Animal.size == size)
    if sex:
        stmt = stmt.where(Animal.sex == sex)
    if city or org:
        stmt = stmt.join(Organization, Animal.org_id == Organization.id)
        if city:
            stmt = stmt.where(Organization.city == city)
        if org:
            stmt = stmt.where(Organization.slug == org)
    stmt = stmt.order_by(Animal.created_at.desc())
    return list(db.scalars(stmt))


@router.get("/animals/{animal_id}", response_model=PublicAnimalResponse)
def get_public_animal(animal_id: UUID, db: Session = Depends(get_db)) -> PublicAnimalResponse:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.status != "disponível":
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    status = compute_health_status(db, animal.id)
    return PublicAnimalResponse.model_validate(
        animal, from_attributes=True
    ).model_copy(update={
        "vaccines_up_to_date": status.vaccines_up_to_date,
        "under_treatment": status.under_treatment,
    })


@router.post("/support-requests", response_model=SupportRequestResponse, status_code=201)
def create_support_request(
    payload: SupportRequestCreate,
    db: Session = Depends(get_db),
) -> SupportRequest:
    animal = db.get(Animal, payload.animal_id)
    if animal is None:
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    request = SupportRequest(
        org_id=animal.org_id,
        # Desnormalizado para a solicitação continuar legível se o animal for removido.
        animal_name=animal.name,
        **payload.model_dump(),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.get("/organizations/{slug}", response_model=PublicOrganizationResponse)
def get_public_organization(slug: str, db: Session = Depends(get_db)) -> PublicOrganizationResponse:
    org = db.scalar(select(Organization).where(Organization.slug == slug))
    if org is None:
        raise HTTPException(status_code=404, detail="ONG não encontrada")

    available = db.scalar(
        select(func.count(Animal.id)).where(Animal.org_id == org.id, Animal.status == "disponível")
    )
    adopted = db.scalar(
        select(func.count(Animal.id)).where(Animal.org_id == org.id, Animal.status == "adotado")
    )
    return PublicOrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        city=org.city,
        description=org.description,
        email=org.email,
        phone=org.phone,
        website=org.website,
        address=org.address,
        founded_year=org.founded_year,
        verified=org.verified,
        logo_url=org.logo_url,
        whatsapp=org.whatsapp,
        instagram=org.instagram,
        facebook=org.facebook,
        pix_key=org.pix_key,
        created_at=org.created_at,
        available_count=available or 0,
        adopted_count=adopted or 0,
    )
