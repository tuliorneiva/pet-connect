from app.core.security import create_access_token, decode_access_token


def test_token_roundtrip_carries_sub_and_org():
    token = create_access_token(subject="42", org_id=7)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["org_id"] == 7
    assert "exp" in payload
