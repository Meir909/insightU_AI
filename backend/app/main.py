from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analytics import router as analytics_router
from app.api.routes.auth import router as auth_router
from app.api.routes.candidates import router as candidates_router
from app.api.routes.committee import router as committee_router
from app.api.routes.health import router as health_router
from app.api.routes.interviews import router as interviews_router
from app.api.routes.uploads import router as uploads_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="InsightU Backend",
    version="0.1.0",
    description="Backend service for candidate evaluation, committee review and interview orchestration.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(candidates_router)
app.include_router(interviews_router)
app.include_router(uploads_router)
app.include_router(committee_router)
app.include_router(analytics_router)
