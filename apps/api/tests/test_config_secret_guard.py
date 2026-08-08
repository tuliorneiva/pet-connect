import pydantic
import pytest

from app.core.config import Settings


def test_default_secret_in_production_raises():
    with pytest.raises((ValueError, pydantic.ValidationError)):
        Settings(environment="production", secret_key="dev-secret-change-me")


def test_default_secret_in_dev_is_allowed():
    Settings(environment="dev", secret_key="dev-secret-change-me")


def test_real_secret_in_production_is_allowed():
    Settings(
        environment="production",
        secret_key="realkey123",
        # Fora de dev o novo guard também exige storage configurado; sem isto o
        # teste falha por um motivo que não é o que ele está verificando.
        storage_bucket="bucket",
        storage_endpoint="https://example.com",
        storage_access_key="key",
        storage_secret_key="secret",
        storage_public_url="https://example.com/public",
    )
