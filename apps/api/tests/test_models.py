from app.models import Organization, User


def test_can_persist_org_and_user(db_session):
    org = Organization(name="Abrigo Feliz", slug="abrigo-feliz", city="João Pessoa")
    db_session.add(org)
    db_session.flush()
    user = User(
        org_id=org.id,
        name="Ana",
        email="ana@abrigo.org",
        password_hash="x",
    )
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.org_id == org.id
