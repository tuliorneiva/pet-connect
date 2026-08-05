import uuid

from app.core.security import create_access_token, decode_access_token


def test_token_roundtrip_carries_sub_and_org():
    org_id = uuid.uuid4()
    token = create_access_token(subject="42", org_id=org_id)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    # O claim viaja como string: UUID não é serializável em JSON.
    assert payload["org_id"] == str(org_id)
    assert uuid.UUID(payload["org_id"]) == org_id
    assert "exp" in payload
