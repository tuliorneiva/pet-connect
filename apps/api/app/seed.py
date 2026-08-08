"""Populate the database with demo data for presentations.

Run (with the API venv active and DATABASE_URL pointing at the target DB):
    python -m app.seed

Idempotent: if the demo ONG already exists, it does nothing.
"""
from datetime import date, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Animal, AnimalPhoto, Medication, Organization, SupportRequest, User, Vaccination

DEMO_EMAIL = "demo@petconnect.org"
DEMO_PASSWORD = "demo123"


def seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == DEMO_EMAIL)):
            print("Demo data already present — skipping.")
            return

        org = Organization(
            name="Abrigo Amigo Fiel",
            slug="abrigo-amigo-fiel",
            city="João Pessoa",
            description=(
                "O Abrigo Amigo Fiel resgata, cuida e encaminha para adoção cães e gatos "
                "em situação de abandono em João Pessoa e região. Todos os animais passam por "
                "avaliação veterinária, vacinação e castração antes de irem para um novo lar."
            ),
            email="contato@amigofiel.org",
            phone="(83) 99999-0000",
            website="amigofiel.org",
            address="Rua das Acácias, 240 — Bancários, João Pessoa/PB",
            founded_year=2019,
            verified=True,
        )
        db.add(org)
        db.flush()

        db.add(
            User(
                org_id=org.id,
                name="Caio",
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
            )
        )

        today = date.today()
        animals = [
            Animal(org_id=org.id, name="Thor", species="cão", breed="SRD", sex="macho", size="G",
                   birth_estimate="3 anos", status="disponível",
                   description="Dócil, brincalhão e ótimo com crianças."),
            Animal(org_id=org.id, name="Mel", species="cão", breed="Labrador", sex="fêmea", size="M",
                   birth_estimate="1 ano", status="disponível",
                   description="Cheia de energia, adora passear."),
            Animal(org_id=org.id, name="Frajola", species="gato", breed="SRD", sex="macho", size="P",
                   birth_estimate="2 anos", status="disponível",
                   description="Calmo e carinhoso, gosta de colo."),
            Animal(org_id=org.id, name="Nina", species="gato", breed="SRD", sex="fêmea", size="P",
                   birth_estimate="6 meses", status="em_processo",
                   description="Filhote curiosa e afetuosa."),
            Animal(org_id=org.id, name="Bob", species="cão", breed="Poodle", sex="macho", size="P",
                   birth_estimate="5 anos", status="adotado",
                   description="Já encontrou um lar!"),
        ]
        db.add_all(animals)
        db.flush()

        # O seed roda offline: as fotos de demonstração entram como links externos,
        # sem download e sem tocar no bucket.
        demo_photos = [
            "https://placedog.net/500/375?id=1",
            "https://placedog.net/500/375?id=2",
            "https://placekitten.com/500/375",
            "https://placekitten.com/501/375",
            "https://placedog.net/500/375?id=3",
        ]
        for animal, url in zip(animals, demo_photos):
            db.add(
                AnimalPhoto(
                    animal_id=animal.id, storage_key=url, is_external=True, sort_order=0
                )
            )

        thor, mel, frajola = animals[0], animals[1], animals[2]

        # Overdue vaccine (alert: atrasado)
        db.add(Vaccination(animal_id=thor.id, vaccine_name="Antirrábica", due_at=today - timedelta(days=5)))
        # Upcoming vaccine (alert: pendente)
        db.add(Vaccination(animal_id=mel.id, vaccine_name="V10", due_at=today + timedelta(days=3)))
        # Applied vaccine (no alert)
        db.add(Vaccination(animal_id=frajola.id, vaccine_name="Quádrupla felina", applied_at=today - timedelta(days=30)))
        # Overdue medication dose (alert: atrasado)
        db.add(Medication(animal_id=thor.id, name="Vermífugo", dosage="1 comp.", next_dose_at=today - timedelta(days=1)))

        db.add(
            SupportRequest(
                animal_id=frajola.id,
                animal_name=frajola.name,
                org_id=org.id,
                type="adoção",
                requester_name="João Silva",
                requester_email="joao@example.com",
                requester_phone="(83) 99999-0000",
                message="Tenho quintal e experiência com gatos.",
                status="nova",
            )
        )

        db.commit()
        print(f"Seeded demo ONG '{org.name}'. Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
