from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Animal, User
from app.schemas.animal import AnimalCreate, AnimalResponse, AnimalUpdate

router = APIRouter(prefix="/api/admin/animals", tags=["admin:animals"])


def _get_owned_animal(animal_id: UUID, org_id: UUID, db: Session) -> Animal:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.org_id != org_id:
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    return animal


@router.get("", response_model=list[AnimalResponse])
def list_animals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Animal]:
    return list(
        db.scalars(
            select(Animal)
            .where(Animal.org_id == current_user.org_id)
            .order_by(Animal.created_at.desc())
        )
    )


@router.post("", response_model=AnimalResponse, status_code=201)
def create_animal(
    payload: AnimalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Animal:
    animal = Animal(org_id=current_user.org_id, **payload.model_dump())
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return animal


@router.get("/{animal_id}", response_model=AnimalResponse)
def get_animal(
    animal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Animal:
    return _get_owned_animal(animal_id, current_user.org_id, db)


@router.patch("/{animal_id}", response_model=AnimalResponse)
def update_animal(
    animal_id: UUID,
    payload: AnimalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Animal:
    animal = _get_owned_animal(animal_id, current_user.org_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(animal, key, value)
    db.commit()
    db.refresh(animal)
    return animal


@router.delete("/{animal_id}", status_code=204)
def delete_animal(
    animal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    animal = _get_owned_animal(animal_id, current_user.org_id, db)
    db.delete(animal)
    db.commit()
