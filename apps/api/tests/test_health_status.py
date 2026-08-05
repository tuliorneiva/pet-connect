from datetime import date, timedelta

from app.models import Animal, Medication, Organization, Vaccination
from app.services.health_status import compute_health_status

TODAY = date(2026, 8, 5)


def _animal(db):
    org = Organization(name="Abrigo", slug=f"abrigo-{id(db)}")
    db.add(org)
    db.flush()
    animal = Animal(org_id=org.id, name="Mel", species="cão")
    db.add(animal)
    db.flush()
    return animal


def test_sem_vacina_registrada_nao_afirma_nada(db_session):
    animal = _animal(db_session)
    status = compute_health_status(db_session, animal.id, today=TODAY)
    assert status.vaccines_up_to_date is None
    assert status.under_treatment is False


def test_vacina_vencida_e_nao_aplicada_reprova(db_session):
    animal = _animal(db_session)
    db_session.add(Vaccination(animal_id=animal.id, vaccine_name="V10",
                               due_at=TODAY - timedelta(days=1)))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).vaccines_up_to_date is False


def test_vacina_aplicada_conta_como_em_dia(db_session):
    animal = _animal(db_session)
    db_session.add(Vaccination(animal_id=animal.id, vaccine_name="V10",
                               applied_at=TODAY - timedelta(days=30),
                               due_at=TODAY - timedelta(days=1)))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).vaccines_up_to_date is True


def test_vacina_com_vencimento_futuro_conta_como_em_dia(db_session):
    animal = _animal(db_session)
    db_session.add(Vaccination(animal_id=animal.id, vaccine_name="V10",
                               due_at=TODAY + timedelta(days=10)))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).vaccines_up_to_date is True


def test_medicacao_ativa_marca_tratamento(db_session):
    animal = _animal(db_session)
    db_session.add(Medication(animal_id=animal.id, name="Antibiótico", status="ativa"))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).under_treatment is True


def test_medicacao_concluida_nao_marca_tratamento(db_session):
    animal = _animal(db_session)
    db_session.add(Medication(animal_id=animal.id, name="Antibiótico", status="concluída"))
    db_session.flush()
    assert compute_health_status(db_session, animal.id, today=TODAY).under_treatment is False
