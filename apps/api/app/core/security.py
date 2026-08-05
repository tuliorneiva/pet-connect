from uuid import UUID

from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, org_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    # UUID não é serializável em JSON — o claim vai como string.
    payload = {"sub": subject, "org_id": str(org_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token, settings.secret_key, algorithms=[settings.jwt_algorithm]
    )
