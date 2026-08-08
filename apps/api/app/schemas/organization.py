from uuid import UUID

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrganizationAdminResponse(BaseModel):
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
    whatsapp: str | None
    instagram: str | None
    facebook: str | None
    pix_key: str | None
    created_at: datetime


class OrganizationUpdate(BaseModel):
    # slug e verified ficam de fora: slug é o endereço público (mudar quebra link
    # salvo/compartilhado), verified é selo da plataforma, não autoatribuível.
    name: str | None = Field(default=None, min_length=1, max_length=200)
    city: str | None = None
    description: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None
    founded_year: int | None = Field(default=None, ge=1900, le=date.today().year)
    # Aceitam texto livre (número, @handle ou URL completa) — a normalização em
    # link clicável acontece no frontend, na hora de montar o href.
    whatsapp: str | None = Field(default=None, max_length=40)
    instagram: str | None = Field(default=None, max_length=255)
    facebook: str | None = Field(default=None, max_length=255)
    # CPF, CNPJ, e-mail, telefone ou chave aleatória — formatos bem diferentes
    # entre si, então fica como texto livre em vez de validar um formato específico.
    pix_key: str | None = Field(default=None, max_length=255)


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
    whatsapp: str | None
    instagram: str | None
    facebook: str | None
    pix_key: str | None
    created_at: datetime
    available_count: int
    adopted_count: int
