import io

import pytest

from app.main import app
from app.services.storage import get_storage


class FakeStorage:
    """Dublê do bucket. Nenhum teste toca a rede."""

    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.deleted: list[str] = []

    def save(self, data: bytes, content_type: str) -> str:
        from app.services.storage import build_storage_key

        key = build_storage_key(content_type)
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


def _animal(client, token, name="Rex"):
    return client.post(
        "/api/admin/animals", headers=_auth(token), json={"name": name, "species": "cão"}
    ).json()


def _upload(client, token, animal_id, *, content=b"fake-bytes", filename="foto.jpg", ctype="image/jpeg"):
    return client.post(
        f"/api/admin/animals/{animal_id}/photos",
        headers=_auth(token),
        files={"file": (filename, io.BytesIO(content), ctype)},
    )


@pytest.mark.parametrize(
    "ctype,filename",
    [("image/jpeg", "a.jpg"), ("image/png", "a.png"), ("image/webp", "a.webp")],
)
def test_upload_accepts_the_three_image_types(client, storage, ctype, filename):
    token = _register(client)
    animal = _animal(client, token)

    resp = _upload(client, token, animal["id"], filename=filename, ctype=ctype)

    assert resp.status_code == 201
    assert resp.json()["sort_order"] == 0
    assert len(storage.objects) == 1


def test_uploads_are_appended_at_the_end_of_the_order(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    first = _upload(client, token, animal["id"]).json()
    second = _upload(client, token, animal["id"]).json()

    assert first["sort_order"] == 0
    assert second["sort_order"] == 1


def test_upload_rejects_a_content_type_that_is_not_an_image(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    resp = _upload(client, token, animal["id"], filename="x.pdf", ctype="application/pdf")

    assert resp.status_code == 422
    assert "JPG, PNG ou WEBP" in resp.json()["detail"]
    assert storage.objects == {}


def test_upload_rejects_a_file_over_one_megabyte(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    resp = _upload(client, token, animal["id"], content=b"x" * (1_048_576 + 1))

    assert resp.status_code == 422
    assert "1 MB" in resp.json()["detail"]
    assert storage.objects == {}


def test_upload_rejects_the_fifth_photo(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    for _ in range(4):
        assert _upload(client, token, animal["id"]).status_code == 201

    resp = _upload(client, token, animal["id"])

    assert resp.status_code == 422
    assert "4 fotos" in resp.json()["detail"]
    assert len(storage.objects) == 4


def test_malicious_filename_cannot_escape_the_animals_prefix(client, storage):
    token = _register(client)
    animal = _animal(client, token)

    _upload(client, token, animal["id"], filename="../../etc/passwd")

    key = next(iter(storage.objects))
    assert key.startswith("animals/")
    assert ".." not in key
    assert "passwd" not in key


def test_another_org_cannot_upload_to_this_animal(client, storage):
    token_a = _register(client, email="a@x.org", org_name="A")
    token_b = _register(client, email="b@x.org", org_name="B")
    animal = _animal(client, token_a)

    assert _upload(client, token_b, animal["id"]).status_code == 404
    assert storage.objects == {}


def test_another_org_cannot_delete_this_photo(client, storage):
    token_a = _register(client, email="a@x.org", org_name="A")
    token_b = _register(client, email="b@x.org", org_name="B")
    animal = _animal(client, token_a)
    photo = _upload(client, token_a, animal["id"]).json()

    resp = client.delete(
        f"/api/admin/animals/{animal['id']}/photos/{photo['id']}", headers=_auth(token_b)
    )

    assert resp.status_code == 404
    assert storage.deleted == []


def test_deleting_a_photo_removes_it_from_the_bucket_and_closes_the_gap(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    first = _upload(client, token, animal["id"]).json()
    _upload(client, token, animal["id"])

    resp = client.delete(
        f"/api/admin/animals/{animal['id']}/photos/{first['id']}", headers=_auth(token)
    )

    assert resp.status_code == 204
    assert len(storage.deleted) == 1
    # a que sobrou vira capa; ordem sem buraco
    remaining = client.get(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).json()
    assert len(remaining["photos"]) == 1
    assert remaining["photo_url"] == remaining["photos"][0]


def test_setting_a_cover_moves_it_to_the_front(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    _upload(client, token, animal["id"])
    second = _upload(client, token, animal["id"]).json()
    third = _upload(client, token, animal["id"]).json()

    resp = client.patch(
        f"/api/admin/animals/{animal['id']}/photos/{third['id']}/cover", headers=_auth(token)
    )

    assert resp.status_code == 200
    order = [p["id"] for p in resp.json()]
    assert order[0] == third["id"]
    # as outras mantêm a ordem relativa entre si
    assert order.index(second["id"]) == 2
    assert [p["sort_order"] for p in resp.json()] == [0, 1, 2]

    detail = client.get(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).json()
    assert detail["photo_url"] == detail["photos"][0]


def test_deleting_the_animal_removes_its_photos(client, storage):
    token = _register(client)
    animal = _animal(client, token)
    _upload(client, token, animal["id"])

    assert client.delete(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).status_code == 204
    assert client.get(f"/api/admin/animals/{animal['id']}", headers=_auth(token)).status_code == 404
