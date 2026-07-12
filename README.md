# PetConnect (PetConecta)

Plataforma web para gestão de abrigos de animais e vitrine de adoção.

## Rodando com Docker

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000 (docs em `/docs`)
- Web: http://localhost:5173

## Backend (dev local)

```bash
cd apps/api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pytest
```

Ver design em `docs/superpowers/specs/`.
