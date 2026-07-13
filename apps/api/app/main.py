from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    animals,
    auth,
    dashboard,
    health,
    public,
    support_requests,
)

app = FastAPI(title="PetConnect API")

origins = [
    origin.strip()
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(animals.router)
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(support_requests.router)
app.include_router(public.router)
