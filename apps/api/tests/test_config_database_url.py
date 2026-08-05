import pytest

from app.core.config import Settings


@pytest.mark.parametrize(
    "raw",
    [
        "postgresql://u:p@host:5432/db",  # formato do Railway
        "postgres://u:p@host:5432/db",  # formato legado do Heroku
    ],
)
def test_managed_provider_url_gets_psycopg2_driver(raw):
    settings = Settings(database_url=raw, secret_key="x", environment="dev")
    assert settings.database_url.startswith("postgresql+psycopg2://")
    assert settings.database_url.endswith("u:p@host:5432/db")


def test_explicit_driver_is_left_alone():
    raw = "postgresql+psycopg2://u:p@host:5432/db"
    settings = Settings(database_url=raw, secret_key="x", environment="dev")
    assert settings.database_url == raw
