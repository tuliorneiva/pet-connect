from datetime import date, timedelta


def _register(client):
    resp = client.post(
        "/api/auth/register",
        json={"org_name": "Abrigo A", "city": "JP", "name": "Ana", "email": "ana@abrigo.org", "password": "s3cret!"},
    )
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_vaccination_and_medication_crud(client):
    token = _register(client)
    animal = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()
    aid = animal["id"]

    vacc = client.post(f"/api/admin/animals/{aid}/vaccinations", headers=_auth(token), json={"vaccine_name": "V10"})
    assert vacc.status_code == 201
    assert client.get(f"/api/admin/animals/{aid}/vaccinations", headers=_auth(token)).json()[0]["vaccine_name"] == "V10"

    med = client.post(f"/api/admin/animals/{aid}/medications", headers=_auth(token), json={"name": "Antibiótico"})
    assert med.status_code == 201

    rec = client.post(f"/api/admin/animals/{aid}/medical-records", headers=_auth(token), json={"title": "Consulta inicial"})
    assert rec.status_code == 201


def test_alerts_flag_overdue_vaccine_and_medication(client):
    token = _register(client)
    animal = client.post("/api/admin/animals", headers=_auth(token), json={"name": "Rex", "species": "cão"}).json()
    aid = animal["id"]
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    soon = (date.today() + timedelta(days=3)).isoformat()
    far = (date.today() + timedelta(days=60)).isoformat()

    # overdue vaccine (due yesterday, not applied)
    client.post(f"/api/admin/animals/{aid}/vaccinations", headers=_auth(token), json={"vaccine_name": "Raiva", "due_at": yesterday})
    # upcoming vaccine within window
    client.post(f"/api/admin/animals/{aid}/vaccinations", headers=_auth(token), json={"vaccine_name": "V10", "due_at": soon})
    # far-future vaccine -> not alerted
    client.post(f"/api/admin/animals/{aid}/vaccinations", headers=_auth(token), json={"vaccine_name": "Gripe", "due_at": far})
    # overdue medication dose
    client.post(f"/api/admin/animals/{aid}/medications", headers=_auth(token), json={"name": "Verme", "next_dose_at": yesterday})

    alerts = client.get("/api/admin/dashboard/alerts", headers=_auth(token))
    assert alerts.status_code == 200
    items = alerts.json()
    descriptions = {i["description"]: i["level"] for i in items}
    assert descriptions.get("Vacina Raiva") == "atrasado"
    assert descriptions.get("Vacina V10") == "pendente"
    assert "Vacina Gripe" not in descriptions
    assert descriptions.get("Dose de Verme") == "atrasado"


def test_dashboard_summary_counts(client):
    token = _register(client)
    client.post("/api/admin/animals", headers=_auth(token), json={"name": "A", "species": "cão"})
    b = client.post("/api/admin/animals", headers=_auth(token), json={"name": "B", "species": "cão"}).json()
    client.patch(f"/api/admin/animals/{b['id']}", headers=_auth(token), json={"status": "adotado"})

    summary = client.get("/api/admin/dashboard/summary", headers=_auth(token)).json()
    assert summary["animals_total"] == 2
    assert summary["animals_available"] == 1
    assert summary["animals_adopted"] == 1
