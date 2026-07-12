import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models import Organization, User
from app.schemas.auth import RegisterRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    return re.sub(r"[\s_-]+", "-", value)


def _unique_slug(db: Session, org_name: str) -> str:
    base = slugify(org_name) or "ong"
    slug = base
    i = 1
    while db.scalar(select(Organization).where(Organization.slug == slug)):
        i += 1
        slug = f"{base}-{i}"
    return slug


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    org = Organization(
        name=payload.org_name,
        slug=_unique_slug(db, payload.org_name),
        city=payload.city,
    )
    db.add(org)
    db.flush()

    user = User(
        org_id=org.id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()

    token = create_access_token(subject=str(user.id), org_id=org.id)
    return TokenResponse(access_token=token)
