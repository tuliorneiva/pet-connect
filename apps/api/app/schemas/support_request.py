from uuid import UUID

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

SupportType = Literal["adoção", "lar_temporário", "apadrinhamento"]
SupportStatus = Literal["nova", "em_análise", "aprovada", "recusada", "concluída"]


class SupportRequestCreate(BaseModel):
    animal_id: UUID
    type: SupportType
    requester_name: str
    requester_email: EmailStr
    requester_phone: str | None = None
    message: str | None = None


class SupportRequestUpdate(BaseModel):
    status: SupportStatus


class SupportRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    animal_id: UUID | None
    animal_name: str | None
    org_id: UUID
    type: str
    requester_name: str
    requester_email: EmailStr
    requester_phone: str | None
    message: str | None
    status: str
    created_at: datetime
