def _register_payload(**over):
    base = {
        "org_name": "Abrigo Feliz",
        "city": "João Pessoa",
        "name": "Ana",
        "email": "ana@abrigo.org",
        "password": "s3cret!",
    }
    base.update(over)
    return base


def test_register_returns_token(client):
    resp = client.post("/api/auth/register", json=_register_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_register_duplicate_email_rejected(client):
    client.post("/api/auth/register", json=_register_payload())
    resp = client.post("/api/auth/register", json=_register_payload(org_name="Outro"))
    assert resp.status_code == 400
