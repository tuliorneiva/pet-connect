from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnimalPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    sort_order: int
