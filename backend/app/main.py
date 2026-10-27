import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import (
    ChatMessage,
    GeneratedPlan,
    HealthMetrics,
    Profile,
    ProgressLog,
    User,
)
from app.routers.auth import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.coach import router as coach_router
from app.routers.health import router as health_router
from app.routers.health_metrics import router as health_metrics_router
from app.routers.profile import router as profile_router
from app.routers.plans import router as plans_router
from app.routers.progress import router as progress_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="WellAI API", lifespan=lifespan)

def parse_frontend_origins(value: str | None) -> list[str]:
    configured = value if value is not None else "http://localhost:5173"
    origins = [origin.strip().rstrip("/") for origin in configured.split(",")]
    return [origin for origin in origins if origin]


frontend_origins = parse_frontend_origins(os.getenv("FRONTEND_ORIGINS"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(health_metrics_router)
app.include_router(plans_router)
app.include_router(coach_router)
app.include_router(chat_router)
app.include_router(progress_router)
