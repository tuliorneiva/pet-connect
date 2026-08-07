from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Animal, AnimalPhoto, User
from app.schemas.animal_photo import AnimalPhotoResponse
from app.services.storage import (
    EXTENSION_BY_CONTENT_TYPE,
    MAX_PHOTO_BYTES,
    MAX_PHOTOS_PER_ANIMAL,
    Storage,
    get_storage,
)

router = APIRouter(prefix="/api/admin/animals/{animal_id}/photos", tags=["admin:photos"])


def _get_owned_animal(animal_id: UUID, org_id: UUID, db: Session) -> Animal:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.org_id != org_id:
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    return animal


def _photos_of(animal_id: UUID, db: Session) -> list[AnimalPhoto]:
    return list(
        db.scalars(
            select(AnimalPhoto)
            .where(AnimalPhoto.animal_id == animal_id)
            .order_by(AnimalPhoto.sort_order)
        )
    )


def _renumber(photos: list[AnimalPhoto]) -> None:
    """Reescreve sort_order como 0..n-1, sem buracos.

    Buraco na sequência não quebra a ordenação, mas faz o próximo upload calcular
    uma posição errada — o append usa a contagem, não o último valor.
    """
    for position, photo in enumerate(photos):
        photo.sort_order = position


@router.post("", response_model=AnimalPhotoResponse, status_code=201)
def upload_photo(
    animal_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
) -> AnimalPhoto:
    _get_owned_animal(animal_id, current_user.org_id, db)

    if file.content_type not in EXTENSION_BY_CONTENT_TYPE:
        raise HTTPException(status_code=422, detail="A foto precisa ser JPG, PNG ou WEBP.")

    data = file.file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=422, detail="Cada foto precisa ter no máximo 1 MB.")

    existing = _photos_of(animal_id, db)
    if len(existing) >= MAX_PHOTOS_PER_ANIMAL:
        raise HTTPException(status_code=422, detail="O animal já tem 4 fotos. Remova uma antes de adicionar outra.")

    key = storage.save(data, file.content_type)
    photo = AnimalPhoto(
        animal_id=animal_id, storage_key=key, is_external=False, sort_order=len(existing)
    )
    db.add(photo)
    try:
        db.commit()
    except Exception:
        # O objeto já subiu; sem a linha no banco ele viraria lixo invisível no bucket.
        db.rollback()
        storage.delete(key)
        raise
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}", status_code=204)
def delete_photo(
    animal_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
) -> None:
    _get_owned_animal(animal_id, current_user.org_id, db)

    photo = db.get(AnimalPhoto, photo_id)
    if photo is None or photo.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    key, is_external = photo.storage_key, photo.is_external
    db.delete(photo)
    db.flush()
    _renumber(_photos_of(animal_id, db))
    db.commit()

    # Banco primeiro, bucket depois: objeto órfão é barato, registro apontando para
    # objeto inexistente quebra a página.
    if not is_external:
        storage.delete(key)


@router.patch("/{photo_id}/cover", response_model=list[AnimalPhotoResponse])
def set_cover(
    animal_id: UUID,
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnimalPhoto]:
    _get_owned_animal(animal_id, current_user.org_id, db)

    photos = _photos_of(animal_id, db)
    target = next((p for p in photos if p.id == photo_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    # A escolhida vai para a frente; as demais mantêm a ordem relativa entre si.
    _renumber([target] + [p for p in photos if p.id != photo_id])
    db.commit()
    return _photos_of(animal_id, db)
