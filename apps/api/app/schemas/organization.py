from uuid import UUID

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PublicOrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    city: str | None
    description: str | None
    email: str | None
    phone: str | None
    website: str | None
    address: str | None
    founded_year: int | None
    verified: bool
    logo_url: str | None
    created_at: datetime
    available_count: int
    adopted_count: int
