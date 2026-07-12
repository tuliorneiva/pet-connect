from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://petconnect:petconnect@localhost:5432/petconnect"
    )
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24
    jwt_algorithm: str = "HS256"


settings = Settings()
