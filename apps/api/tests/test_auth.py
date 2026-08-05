import uuid

from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


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


def test_login_success(client):
    client.post("/api/auth/register", json=_register_payload())
    resp = client.post(
        "/api/auth/login",
        json={"email": "ana@abrigo.org", "password": "s3cret!"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_rejected(client):
    client.post("/api/auth/register", json=_register_payload())
    resp = client.post(
        "/api/auth/login",
        json={"email": "ana@abrigo.org", "password": "nope"},
    )
    assert resp.status_code == 401


def _token(client, **over):
    client.post("/api/auth/register", json=_register_payload(**over))
    resp = client.post(
        "/api/auth/login",
        json={"email": over.get("email", "ana@abrigo.org"), "password": "s3cret!"},
    )
    return resp.json()["access_token"]


def test_me_returns_current_user_and_org(client):
    token = _token(client)
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "ana@abrigo.org"
    # IDs são UUID — não sequenciais, então só dá para exigir que seja um UUID válido.
    assert uuid.UUID(body["org_id"])


def test_two_orgs_get_distinct_org_ids(client):
    token_a = _token(client)
    token_b = _token(client, org_name="Abrigo B", email="b@abrigo.org")
    org_a = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_a}"}
    ).json()["org_id"]
    org_b = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_b}"}
    ).json()["org_id"]
    assert org_a != org_b


def test_me_without_token_is_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_with_non_numeric_sub_is_401(client):
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    token = jwt.encode(
        {"sub": "not-a-number", "org_id": 1, "exp": expire},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
