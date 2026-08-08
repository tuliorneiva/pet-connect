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


def test_key_uses_the_given_folder():
    # A logo da ONG mora em outra pasta do mesmo bucket, não em "animals/".
    key = build_storage_key("image/jpeg", folder="orgs")
    assert key.startswith("orgs/")


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


def test_url_follows_the_instance_not_the_global_settings(monkeypatch):
    from app.core import config
    from app.services.storage import S3Storage

    # Propositalmente diferente do valor global, para provar que S3Storage.url()
    # usa o que foi passado no construtor, não o singleton `settings`.
    monkeypatch.setattr(config.settings, "storage_public_url", "https://global.example/bucket")
    storage = S3Storage(
        bucket="outro",
        endpoint="https://endpoint.example/storage/v1/s3",
        region="sa-east-1",
        access_key="chave",
        secret_key="segredo",
        public_url="https://instancia.example/outro/",
    )

    assert storage.url("animals/a.jpg") == "https://instancia.example/outro/animals/a.jpg"
