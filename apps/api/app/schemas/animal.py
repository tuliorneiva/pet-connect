from uuid import UUID

from datetime import datetime

from pydantic import AliasPath, BaseModel, ConfigDict, Field


class AnimalBase(BaseModel):
    name: str
    species: str
    breed: str | None = None
    sex: str | None = None
    size: str | None = None
    birth_estimate: str | None = None
    description: str | None = None
    photo_url: str | None = None
    status: str = "disponível"


class AnimalCreate(AnimalBase):
    pass


class AnimalUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    sex: str | None = None
    size: str | None = None
    birth_estimate: str | None = None
    description: str | None = None
    photo_url: str | None = None
    status: str | None = None


class AnimalResponse(AnimalBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    created_at: datetime


class PublicAnimalListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    species: str
    breed: str | None
    sex: str | None
    size: str | None
    birth_estimate: str | None
    description: str | None
    photo_url: str | None
    org_id: UUID
    org_name: str = Field(validation_alias=AliasPath("organization", "name"))
    org_city: str | None = Field(default=None, validation_alias=AliasPath("organization", "city"))
    org_slug: str = Field(validation_alias=AliasPath("organization", "slug"))


class PublicAnimalResponse(PublicAnimalListResponse):
    # A listagem não calcula os sinais de saúde (custaria uma query por animal);
    # só o detalhe os computa via compute_health_status. Ver PublicAnimalListResponse.
    vaccines_up_to_date: bool | None = None
    under_treatment: bool = False
