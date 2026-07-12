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

    @model_validator(mode="after")
    def _guard_secret_key_default(self) -> "Settings":
        if self.secret_key == "dev-secret-change-me" and self.environment != "dev":
            raise ValueError(
                "SECRET_KEY must be set to a non-default value outside dev"
            )
        return self


settings = Settings()
