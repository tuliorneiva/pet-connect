from app.models import Animal, AnimalPhoto, Organization
from app.schemas.animal import AnimalCreate, AnimalResponse, PublicAnimalListResponse


def _animal_with_photos(db_session, keys_and_orders):
    org = Organization(name="Abrigo A", slug="abrigo-a", city="João Pessoa")
    db_session.add(org)
    db_session.flush()
    animal = Animal(org_id=org.id, name="Rex", species="cão")
    db_session.add(animal)
    db_session.flush()
    for key, order in keys_and_orders:
        db_session.add(
            AnimalPhoto(animal_id=animal.id, storage_key=key, is_external=True, sort_order=order)
        )
    db_session.commit()
    db_session.refresh(animal)
    return animal


def test_photos_serialize_as_urls_in_sort_order(db_session):
    animal = _animal_with_photos(db_session, [("https://x/b.jpg", 1), ("https://x/a.jpg", 0)])
    body = AnimalResponse.model_validate(animal)
    assert body.photos == ["https://x/a.jpg", "https://x/b.jpg"]


def test_photo_url_mirrors_the_cover(db_session):
    animal = _animal_with_photos(db_session, [("https://x/b.jpg", 1), ("https://x/a.jpg", 0)])
    assert AnimalResponse.model_validate(animal).photo_url == "https://x/a.jpg"


def test_photo_url_is_null_without_photos(db_session):
    animal = _animal_with_photos(db_session, [])
    body = AnimalResponse.model_validate(animal)
    assert body.photo_url is None
    assert body.photos == []


def test_create_payload_rejects_a_photo_url():
    # Foto agora entra por upload. Aceitar a URL aqui seria uma segunda fonte da verdade.
    payload = AnimalCreate.model_validate({"name": "Rex", "species": "cão", "photo_url": "https://x/a.jpg"})
    assert not hasattr(payload, "photo_url")


def test_admin_response_carries_photo_ids(db_session):
    # A ONG precisa do id para remover a foto e trocar a capa.
    animal = _animal_with_photos(db_session, [("https://x/a.jpg", 0)])
    body = AnimalResponse.model_validate(animal)
    assert body.photo_items[0].url == "https://x/a.jpg"
    assert body.photo_items[0].id == animal.photos[0].id


def test_public_response_does_not_carry_photo_ids(db_session):
    # Id de foto é ferramenta de edição; não tem por que vazar para a vitrine.
    animal = _animal_with_photos(db_session, [("https://x/a.jpg", 0)])
    body = PublicAnimalListResponse.model_validate(animal)
    assert "photo_items" not in body.model_dump()
