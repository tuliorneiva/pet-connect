import uuid

import pytest

from app.services.storage import (
    EXTENSION_BY_CONTENT_TYPE,
    MAX_PHOTO_BYTES,
    MAX_PHOTOS_PER_ANIMAL,
    build_storage_key,
    resolve_photo_url,
)


def test_limits_match_the_bucket_and_the_layout():
    assert MAX_PHOTO_BYTES == 1_048_576
    assert MAX_PHOTOS_PER_ANIMAL == 4


def test_accepted_content_types_map_to_extensions():
    assert EXTENSION_BY_CONTENT_TYPE == {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }


def test_key_is_generated_server_side_and_ignores_the_client_filename():
    key = build_storage_key("image/png")
    assert key.startswith("animals/")
    assert key.endswith(".png")
    # o miolo é um uuid4 válido, não algo vindo do cliente
    uuid.UUID(key.removeprefix("animals/").removesuffix(".png"))


def test_two_keys_never_collide():
    assert build_storage_key("image/jpeg") != build_storage_key("image/jpeg")


def test_key_for_unknown_content_type_is_a_programming_error():
    # O router valida antes; chegar aqui com tipo inválido é bug nosso, não do usuário.
    with pytest.raises(KeyError):
        build_storage_key("application/pdf")


def test_external_url_is_returned_untouched():
    # O seed grava URLs completas com is_external=True; elas não levam prefixo de bucket.
    assert (
        resolve_photo_url("https://placedog.net/500/375?id=1", is_external=True)
        == "https://placedog.net/500/375?id=1"
    )


def test_internal_key_is_prefixed_with_the_public_base_url(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "storage_public_url", "https://cdn.example/bucket/")
    # a barra final da configuração não pode virar barra dupla na URL
    assert (
        resolve_photo_url("animals/abc.jpg", is_external=False)
        == "https://cdn.example/bucket/animals/abc.jpg"
    )
