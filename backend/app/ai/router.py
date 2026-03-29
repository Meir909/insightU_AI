from fastapi import APIRouter

from app.ai.endpoints import scoring, interview, detection, copilot, explain, committee

ai_router = APIRouter()
ai_router.include_router(scoring.router)
ai_router.include_router(interview.router)
ai_router.include_router(detection.router)
ai_router.include_router(copilot.router)
ai_router.include_router(explain.router)
ai_router.include_router(committee.router)
