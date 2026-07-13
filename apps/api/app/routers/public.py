from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Animal, Organization, SupportRequest
from app.schemas.animal import PublicAnimalResponse
from app.schemas.support_request import SupportRequestCreate, SupportRequestResponse

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/animals", response_model=list[PublicAnimalResponse])
def list_public_animals(
    species: str | None = None,
    size: str | None = None,
    sex: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
) -> list[Animal]:
    stmt = select(Animal).where(Animal.status == "disponível")
    if species:
        stmt = stmt.where(Animal.species == species)
    if size:
        stmt = stmt.where(Animal.size == size)
    if sex:
        stmt = stmt.where(Animal.sex == sex)
    if city:
        stmt = stmt.join(Organization, Animal.org_id == Organization.id).where(
            Organization.city == city
        )
    stmt = stmt.order_by(Animal.created_at.desc())
    return list(db.scalars(stmt))


@router.get("/animals/{animal_id}", response_model=PublicAnimalResponse)
def get_public_animal(animal_id: int, db: Session = Depends(get_db)) -> Animal:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.status != "disponível":
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    return animal


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
        **payload.model_dump(),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request
