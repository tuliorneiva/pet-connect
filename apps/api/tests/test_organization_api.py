import io

import pytest

from app.main import app
from app.services.storage import get_storage


class FakeStorage:
    """Dublê do bucket. Nenhum teste toca a rede."""

    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.deleted: list[str] = []

    def save(self, data: bytes, content_type: str, folder: str = "animals") -> str:
        from app.services.storage import build_storage_key

        key = build_storage_key(content_type, folder=folder)
        self.objects[key] = data
        return key

    def delete(self, key: str) -> None:
        self.deleted.append(key)
        self.objects.pop(key, None)

    def url(self, key: str) -> str:
        return f"https://cdn.test/{key}"


@pytest.fixture()
def storage():
    fake = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_storage, None)


def _register(client, email="ana@abrigo.org", org_name="Abrigo A"):
    resp = client.post(
        "/api/auth/register",
        json={
            "org_name": org_name,
            "city": "João Pessoa",
            "name": "Ana",
            "email": email,
            "password": "s3cret!",
        },
    )
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_get_returns_the_org_created_at_registration(client):
    token = _register(client, org_name="Abrigo Amigo")

    resp = client.get("/api/admin/organization", headers=_auth(token))

    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Abrigo Amigo"
    assert body["city"] == "João Pessoa"
    assert body["slug"] == "abrigo-amigo"
    assert body["verified"] is False
    assert body["description"] is None


def test_get_without_a_token_is_unauthorized(client):
    resp = client.get("/api/admin/organization")
    assert resp.status_code == 401


def test_patch_updates_only_the_fields_sent(client):
    token = _register(client)

    resp = client.patch(
        "/api/admin/organization",
        headers=_auth(token),
        json={"description": "Resgatamos e cuidamos de cães e gatos.", "phone": "(83) 90000-0000"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["description"] == "Resgatamos e cuidamos de cães e gatos."
    assert body["phone"] == "(83) 90000-0000"
    # cidade veio do registro e não foi tocada pelo patch parcial
    assert body["city"] == "João Pessoa"


def test_patch_cannot_touch_slug_or_verified(client):
    token = _register(client)
    before = client.get("/api/admin/organization", headers=_auth(token)).json()

    resp = client.patch(
        "/api/admin/organization",
        headers=_auth(token),
        json={"slug": "outro-slug", "verified": True},
    )

    assert resp.status_code == 200
    body = resp.json()
    # slug/verified nem existem no schema de update: o pydantic ignora, não falha
    assert body["slug"] == before["slug"]
    assert body["verified"] is False


def test_patch_rejects_an_invalid_email(client):
    token = _register(client)

    resp = client.patch(
        "/api/admin/organization", headers=_auth(token), json={"email": "não-é-email"}
    )

    assert resp.status_code == 422


def test_patch_rejects_a_founding_year_in_the_future(client):
    token = _register(client)

    resp = client.patch(
        "/api/admin/organization", headers=_auth(token), json={"founded_year": 3000}
    )

    assert resp.status_code == 422


def test_patch_updates_the_social_links(client):
    token = _register(client)

    resp = client.patch(
        "/api/admin/organization",
        headers=_auth(token),
        json={"whatsapp": "(83) 90000-0000", "instagram": "@abrigoamigo", "facebook": "abrigoamigo"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["whatsapp"] == "(83) 90000-0000"
    assert body["instagram"] == "@abrigoamigo"
    assert body["facebook"] == "abrigoamigo"


def test_each_org_only_edits_its_own_profile(client):
    token_a = _register(client, email="a@x.org", org_name="A")
    token_b = _register(client, email="b@x.org", org_name="B")

    client.patch("/api/admin/organization", headers=_auth(token_a), json={"city": "Recife"})

    org_b = client.get("/api/admin/organization", headers=_auth(token_b)).json()
    # ambas nascem com a mesma cidade do fixture; o patch em A não pode ter vazado para B
    assert org_b["city"] == "João Pessoa"


def test_logo_upload_sets_the_url_and_saves_to_the_orgs_folder(client, storage):
    token = _register(client)

    resp = client.post(
        "/api/admin/organization/logo",
        headers=_auth(token),
        files={"file": ("logo.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["logo_url"] is not None
    key = next(iter(storage.objects))
    assert key.startswith("orgs/")
    assert body["logo_url"] == f"https://cdn.test/{key}"


def test_logo_upload_rejects_a_non_image_content_type(client, storage):
    token = _register(client)

    resp = client.post(
        "/api/admin/organization/logo",
        headers=_auth(token),
        files={"file": ("x.pdf", io.BytesIO(b"fake"), "application/pdf")},
    )

    assert resp.status_code == 422
    assert storage.objects == {}


def test_logo_upload_rejects_a_file_over_one_megabyte(client, storage):
    token = _register(client)

    resp = client.post(
        "/api/admin/organization/logo",
        headers=_auth(token),
        files={"file": ("logo.jpg", io.BytesIO(b"x" * (1_048_576 + 1)), "image/jpeg")},
    )

    assert resp.status_code == 422
    assert storage.objects == {}


def test_logo_delete_clears_the_url(client, storage):
    token = _register(client)
    client.post(
        "/api/admin/organization/logo",
        headers=_auth(token),
        files={"file": ("logo.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")},
    )

    resp = client.delete("/api/admin/organization/logo", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json()["logo_url"] is None
