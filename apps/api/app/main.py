from fastapi import FastAPI

from app.routers import auth

app = FastAPI(title="PetConnect API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
