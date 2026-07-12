from pydantic import BaseModel, ConfigDict, EmailStr


class RegisterRequest(BaseModel):
    org_name: str
    city: str | None = None
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    org_id: int
