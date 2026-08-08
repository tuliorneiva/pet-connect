def _register(client, email="ong@abrigo.org", org_name="Abrigo Beta"):
    resp = client.post(
        "/api/auth/register",
        json={"org_name": org_name, "city": "Recife", "name": "Bia", "email": email, "password": "s3cret!"},
    )
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _slug_of(client, token):
    # the first (only) public animal reveals the org slug
    a = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()
    return client.get(f"/api/public/animals/{a['id']}").json()["org_slug"]


def test_public_org_returns_profile_and_counts(client):
    token = _register(client)
    slug = _slug_of(client, token)
    # add an adopted animal to exercise adopted_count
    b = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Bob", "species": "cão"}).json()
    client.patch(f"/api/admin/animals/{b['id']}", headers=_auth(token), json={"status": "adotado"})

    resp = client.get(f"/api/public/organizations/{slug}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Abrigo Beta"
    assert body["city"] == "Recife"
    assert body["verified"] is False
    assert body["available_count"] == 1
    assert body["adopted_count"] == 1
    assert body["whatsapp"] is None
    assert body["instagram"] is None
    assert body["facebook"] is None


def test_public_org_returns_the_social_links_when_set(client):
    token = _register(client)
    slug = _slug_of(client, token)
    client.patch(
        "/api/admin/organization",
        headers=_auth(token),
        json={"whatsapp": "5583900000000", "instagram": "abrigobeta", "facebook": "abrigobeta"},
    )

    body = client.get(f"/api/public/organizations/{slug}").json()
    assert body["whatsapp"] == "5583900000000"
    assert body["instagram"] == "abrigobeta"
    assert body["facebook"] == "abrigobeta"


def test_public_org_404_for_unknown_slug(client):
    assert client.get("/api/public/organizations/nao-existe").status_code == 404


def test_public_animals_filter_by_org(client):
    token_a = _register(client, email="a@x.org", org_name="Abrigo A")
    token_b = _register(client, email="b@x.org", org_name="Abrigo B")
    client.post("/api/admin/animals", headers=_auth(token_a), json={"name": "Aa", "species": "cão"})
    client.post("/api/admin/animals", headers=_auth(token_b), json={"name": "Bb", "species": "gato"})
    slug_a = _slug_of(client, token_a)  # creates a second animal for A named Rex

    result = client.get(f"/api/public/animals?org={slug_a}").json()
    names = {x["name"] for x in result}
    assert names == {"Aa", "Rex"}
    assert all(x["org_slug"] == slug_a for x in result)


def test_detalhe_publico_traz_os_sinais_de_saude(client):
    token = _register(client)
    client.post("/api/admin/animals", headers=_auth(token), json={"name": "Mel", "species": "cão"})

    resp = client.get("/api/public/animals")
    animals = resp.json()
    assert animals, "seed precisa de ao menos um animal disponível"
    detail = client.get(f"/api/public/animals/{animals[0]['id']}").json()
    assert "vaccines_up_to_date" in detail
    assert "under_treatment" in detail


def test_listagem_publica_nao_traz_sinais_de_saude(client):
    # A listagem não calcula vaccines_up_to_date/under_treatment (evita N+1); só o
    # detalhe faz isso. Publicar um default aqui mentiria sobre o estado do animal.
    token = _register(client)
    client.post("/api/admin/animals", headers=_auth(token), json={"name": "Mel", "species": "cão"})

    animals = client.get("/api/public/animals").json()
    assert animals, "seed precisa de ao menos um animal disponível"
    assert "vaccines_up_to_date" not in animals[0]
    assert "under_treatment" not in animals[0]
