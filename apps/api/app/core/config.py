from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://petconnect:petconnect@localhost:5432/petconnect"
    )
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24
    jwt_algorithm: str = "HS256"
    environment: str = "dev"
    cors_origins: str = "http://localhost:5173"
    storage_bucket: str = ""
    storage_endpoint: str = ""
    storage_region: str = "us-east-1"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_public_url: str = ""

    @model_validator(mode="after")
    def _normalize_database_url(self) -> "Settings":
        """Provedores gerenciados (Railway, Heroku, Supabase) entregam a URL como
        ``postgres://`` ou ``postgresql://``. O SQLAlchemy precisa do driver
        explícito, e sem isso a aplicação nem sobe."""
        for prefix in ("postgresql+psycopg2://", "postgresql+"):
            if self.database_url.startswith(prefix):
                return self
        for prefix in ("postgresql://", "postgres://"):
            if self.database_url.startswith(prefix):
                self.database_url = (
                    "postgresql+psycopg2://" + self.database_url[len(prefix):]
                )
                break
        return self

    @model_validator(mode="after")
    def _guard_secret_key_default(self) -> "Settings":
        if self.secret_key == "dev-secret-change-me" and self.environment != "dev":
            raise ValueError(
                "SECRET_KEY must be set to a non-default value outside dev"
            )
        return self

    @model_validator(mode="after")
    def _guard_storage_outside_dev(self) -> "Settings":
        """Fora de dev, subir sem storage configurado só se descobre quando a ONG
        tenta mandar a primeira foto e toma erro. Falhar no boot é mais barato."""
        if self.environment == "dev":
            return self
        missing = [
            name
            for name in (
                "storage_bucket",
                "storage_endpoint",
                "storage_access_key",
                "storage_secret_key",
                "storage_public_url",
            )
            if not getattr(self, name)
        ]
        if missing:
            raise ValueError(
                "Storage não configurado fora de dev: " + ", ".join(sorted(missing))
            )
        return self


settings = Settings()
