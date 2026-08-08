from uuid import UUID

from datetime import datetime

from pydantic import AliasPath, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.animal_photo import AnimalPhotoResponse


class AnimalBase(BaseModel):
    name: str
    species: str
    breed: str | None = None
    sex: str | None = None
    size: str | None = None
    birth_estimate: str | None = None
    description: str | None = None
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
    status: str | None = None


class _PhotoFields(BaseModel):
    """Deriva as fotos do relacionamento.

    ``photo_url`` continua no response, espelhando a capa: a vitrine, o ``AnimalCard``
    e a página da ONG seguem funcionando sem saber que agora existe uma tabela.
    """

    photos: list[str] = []
    photo_url: str | None = None

    @field_validator("photos", mode="before")
    @classmethod
    def _photos_to_urls(cls, value: object) -> object:
        if not isinstance(value, list):
            return value
        return [getattr(item, "url", item) for item in value]

    @model_validator(mode="after")
    def _cover_from_photos(self) -> "_PhotoFields":
        if self.photo_url is None and self.photos:
            self.photo_url = self.photos[0]
        return self


class AnimalResponse(AnimalBase, _PhotoFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    created_at: datetime
    # A ONG precisa do id de cada foto para remover e trocar a capa; o adotante não.
    # Por isso este campo existe só aqui, e não em PublicAnimalListResponse.
    photo_items: list[AnimalPhotoResponse] = Field(default=[], validation_alias="photos")


class PublicAnimalListResponse(_PhotoFields):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    species: str
    breed: str | None
    sex: str | None
    size: str | None
    birth_estimate: str | None
    description: str | None
    org_id: UUID
    org_name: str = Field(validation_alias=AliasPath("organization", "name"))
    org_city: str | None = Field(default=None, validation_alias=AliasPath("organization", "city"))
    org_slug: str = Field(validation_alias=AliasPath("organization", "slug"))


class PublicAnimalResponse(PublicAnimalListResponse):
    # A listagem não calcula os sinais de saúde (custaria uma query por animal);
    # só o detalhe os computa via compute_health_status. Ver PublicAnimalListResponse.
    vaccines_up_to_date: bool | None = None
    under_treatment: bool = False
