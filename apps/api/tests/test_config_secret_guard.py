import pydantic
import pytest

from app.core.config import Settings


def test_default_secret_in_production_raises():
    with pytest.raises((ValueError, pydantic.ValidationError)):
        Settings(environment="production", secret_key="dev-secret-change-me")


def test_default_secret_in_dev_is_allowed():
    Settings(environment="dev", secret_key="dev-secret-change-me")


def test_real_secret_in_production_is_allowed():
    Settings(environment="production", secret_key="realkey123")
