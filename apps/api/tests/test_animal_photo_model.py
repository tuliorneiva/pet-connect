from app.models import Animal, AnimalPhoto, Organization


def _org(db_session) -> Organization:
    org = Organization(name="Abrigo A", slug="abrigo-a", city="João Pessoa")
    db_session.add(org)
    db_session.flush()
    return org


def test_photos_come_back_in_sort_order(db_session):
    org = _org(db_session)
    animal = Animal(org_id=org.id, name="Rex", species="cão")
    db_session.add(animal)
    db_session.flush()

    # inseridas fora de ordem de propósito
    db_session.add(AnimalPhoto(animal_id=animal.id, storage_key="animals/b.jpg", sort_order=1))
    db_session.add(AnimalPhoto(animal_id=animal.id, storage_key="animals/a.jpg", sort_order=0))
    db_session.commit()
    db_session.refresh(animal)

    assert [p.storage_key for p in animal.photos] == ["animals/a.jpg", "animals/b.jpg"]


def test_deleting_the_animal_deletes_its_photos(db_session):
    org = _org(db_session)
    animal = Animal(org_id=org.id, name="Rex", species="cão")
    db_session.add(animal)
    db_session.flush()
    db_session.add(AnimalPhoto(animal_id=animal.id, storage_key="animals/a.jpg", sort_order=0))
    db_session.commit()

    db_session.delete(animal)
    db_session.commit()

    assert db_session.query(AnimalPhoto).count() == 0


def test_url_of_an_external_photo_is_the_stored_value(db_session):
    photo = AnimalPhoto(storage_key="https://placedog.net/500/375", is_external=True, sort_order=0)
    assert photo.url == "https://placedog.net/500/375"


def test_url_of_an_internal_photo_uses_the_public_base(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "storage_public_url", "https://cdn.example/bucket")
    photo = AnimalPhoto(storage_key="animals/a.jpg", is_external=False, sort_order=0)
    assert photo.url == "https://cdn.example/bucket/animals/a.jpg"


def test_animal_no_longer_carries_a_photo_url_column(db_session):
    # A coluna virou tabela; se ela ressuscitar, dois lugares passam a discordar
    # sobre qual é a capa.
    assert "photo_url" not in Animal.__table__.columns
