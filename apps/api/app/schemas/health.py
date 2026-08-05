from uuid import UUID

from datetime import date

from pydantic import BaseModel, ConfigDict


# --- Vaccination ---
class VaccinationCreate(BaseModel):
    vaccine_name: str
    applied_at: date | None = None
    due_at: date | None = None
    notes: str | None = None


class VaccinationUpdate(BaseModel):
    vaccine_name: str | None = None
    applied_at: date | None = None
    due_at: date | None = None
    notes: str | None = None


class VaccinationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    animal_id: UUID
    vaccine_name: str
    applied_at: date | None
    due_at: date | None
    notes: str | None


# --- Medication ---
class MedicationCreate(BaseModel):
    name: str
    dosage: str | None = None
    start_at: date | None = None
    end_at: date | None = None
    next_dose_at: date | None = None
    status: str = "ativa"
    notes: str | None = None


class MedicationUpdate(BaseModel):
    name: str | None = None
    dosage: str | None = None
    start_at: date | None = None
    end_at: date | None = None
    next_dose_at: date | None = None
    status: str | None = None
    notes: str | None = None


class MedicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    animal_id: UUID
    name: str
    dosage: str | None
    start_at: date | None
    end_at: date | None
    next_dose_at: date | None
    status: str
    notes: str | None


# --- Medical record ---
class MedicalRecordCreate(BaseModel):
    title: str
    description: str | None = None
    recorded_at: date | None = None


class MedicalRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    animal_id: UUID
    title: str
    description: str | None
    recorded_at: date | None
    created_by: UUID | None


# --- Alerts ---
class AlertItem(BaseModel):
    animal_id: UUID
    animal_name: str
    kind: str  # vacina / medicação
    description: str
    level: str  # pendente / atrasado
    due_at: date | None
