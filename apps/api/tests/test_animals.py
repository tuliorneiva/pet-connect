def _register(client, email="ana@abrigo.org", org_name="Abrigo A"):
    resp = client.post(
        "/api/auth/register",
        json={"org_name": org_name, "city": "João Pessoa", "name": "Ana", "email": email, "password": "s3cret!"},
    )
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_animal(client):
    token = _register(client)
    resp = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Rex"
    assert body["status"] == "disponível"

    listing = client.get("/api/admin/animals", headers=_auth(token))
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_animals_are_org_scoped(client):
    token_a = _register(client, email="a@x.org", org_name="A")
    token_b = _register(client, email="b@x.org", org_name="B")
    created = client.post("/api/admin/animals", headers=_auth(token_a), json={"name": "Rex", "species": "cão"}).json()

    # Org B cannot see or fetch org A's animal
    assert client.get("/api/admin/animals", headers=_auth(token_b)).json() == []
    assert client.get(f"/api/admin/animals/{created['id']}", headers=_auth(token_b)).status_code == 404


def test_update_animal_status(client):
    token = _register(client)
    animal = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()
    resp = client.patch(f"/api/admin/animals/{animal['id']}", headers=_auth(token), json={"status": "adotado"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "adotado"


def test_public_vitrine_shows_only_available(client):
    token = _register(client)
    a = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Disponível", "species": "gato"}).json()
    b = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Adotado", "species": "gato"}).json()
    client.patch(f"/api/admin/animals/{b['id']}", headers=_auth(token), json={"status": "adotado"})

    vitrine = client.get("/api/public/animals")
    assert vitrine.status_code == 200
    names = [x["name"] for x in vitrine.json()]
    assert "Disponível" in names
    assert "Adotado" not in names

    # filter by species
    assert len(client.get("/api/public/animals?species=gato").json()) == 1
    assert client.get("/api/public/animals?species=cão").json() == []
    # detail of available animal
    assert client.get(f"/api/public/animals/{a['id']}").status_code == 200


def test_public_support_request_flow(client):
    token = _register(client)
    animal = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()
    resp = client.post(
        "/api/public/support-requests",
        json={"animal_id": animal["id"], "type": "adoção", "requester_name": "Bia", "requester_email": "bia@x.org", "message": "Quero adotar"},
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "nova"

    # admin sees the request
    admin_list = client.get("/api/admin/support-requests", headers=_auth(token))
    assert admin_list.status_code == 200
    assert len(admin_list.json()) == 1
    req_id = admin_list.json()[0]["id"]

    updated = client.patch(f"/api/admin/support-requests/{req_id}", headers=_auth(token), json={"status": "em_análise"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "em_análise"


def test_public_animal_includes_org_fields(client):
    token = _register(client, org_name="Abrigo Alfa")
    a = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()

    detail = client.get(f"/api/public/animals/{a['id']}").json()
    assert detail["org_name"] == "Abrigo Alfa"
    assert detail["org_city"] == "João Pessoa"
    assert detail["org_slug"]  # non-empty slug

    listing = client.get("/api/public/animals").json()
    assert listing[0]["org_name"] == "Abrigo Alfa"


def test_public_listing_and_detail_expose_photos(client):
    token = _register(client)
    animal = client.post(
        "/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}
    ).json()

    # Sem fotos, os dois lados concordam: lista vazia e capa nula.
    assert animal["photos"] == []
    assert animal["photo_url"] is None

    listing = client.get("/api/public/animals").json()
    assert listing[0]["photos"] == []
    detail = client.get(f"/api/public/animals/{animal['id']}").json()
    assert detail["photos"] == []
