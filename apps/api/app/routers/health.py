from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Animal, MedicalRecord, Medication, User, Vaccination
from app.schemas.health import (
    MedicalRecordCreate,
    MedicalRecordResponse,
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
    VaccinationCreate,
    VaccinationResponse,
    VaccinationUpdate,
)

router = APIRouter(prefix="/api/admin/animals/{animal_id}", tags=["admin:health"])


def _owned_animal(animal_id: int, org_id: int, db: Session) -> Animal:
    animal = db.get(Animal, animal_id)
    if animal is None or animal.org_id != org_id:
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    return animal


# --- Vaccinations ---
@router.get("/vaccinations", response_model=list[VaccinationResponse])
def list_vaccinations(animal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    return list(db.scalars(select(Vaccination).where(Vaccination.animal_id == animal_id)))


@router.post("/vaccinations", response_model=VaccinationResponse, status_code=201)
def create_vaccination(animal_id: int, payload: VaccinationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    vacc = Vaccination(animal_id=animal_id, **payload.model_dump())
    db.add(vacc)
    db.commit()
    db.refresh(vacc)
    return vacc


@router.patch("/vaccinations/{vacc_id}", response_model=VaccinationResponse)
def update_vaccination(animal_id: int, vacc_id: int, payload: VaccinationUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    vacc = db.get(Vaccination, vacc_id)
    if vacc is None or vacc.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Vacina não encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(vacc, key, value)
    db.commit()
    db.refresh(vacc)
    return vacc


@router.delete("/vaccinations/{vacc_id}", status_code=204)
def delete_vaccination(animal_id: int, vacc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    vacc = db.get(Vaccination, vacc_id)
    if vacc is None or vacc.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Vacina não encontrada")
    db.delete(vacc)
    db.commit()


# --- Medications ---
@router.get("/medications", response_model=list[MedicationResponse])
def list_medications(animal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    return list(db.scalars(select(Medication).where(Medication.animal_id == animal_id)))


@router.post("/medications", response_model=MedicationResponse, status_code=201)
def create_medication(animal_id: int, payload: MedicationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    med = Medication(animal_id=animal_id, **payload.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.patch("/medications/{med_id}", response_model=MedicationResponse)
def update_medication(animal_id: int, med_id: int, payload: MedicationUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    med = db.get(Medication, med_id)
    if med is None or med.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Medicação não encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(med, key, value)
    db.commit()
    db.refresh(med)
    return med


@router.delete("/medications/{med_id}", status_code=204)
def delete_medication(animal_id: int, med_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    med = db.get(Medication, med_id)
    if med is None or med.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Medicação não encontrada")
    db.delete(med)
    db.commit()


# --- Medical records ---
@router.get("/medical-records", response_model=list[MedicalRecordResponse])
def list_records(animal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    return list(db.scalars(select(MedicalRecord).where(MedicalRecord.animal_id == animal_id)))


@router.post("/medical-records", response_model=MedicalRecordResponse, status_code=201)
def create_record(animal_id: int, payload: MedicalRecordCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    record = MedicalRecord(animal_id=animal_id, created_by=current_user.id, **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/medical-records/{record_id}", status_code=204)
def delete_record(animal_id: int, record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_animal(animal_id, current_user.org_id, db)
    record = db.get(MedicalRecord, record_id)
    if record is None or record.animal_id != animal_id:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    db.delete(record)
    db.commit()
