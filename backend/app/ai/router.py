from fastapi import APIRouter

from app.ai.endpoints import (
    scoring, interview, detection, copilot, explain, committee,
    baseline, multimodal, feedback, interactive_explain, monitoring, privacy, fairness
)

ai_router = APIRouter()
ai_router.include_router(scoring.router)
ai_router.include_router(interview.router)
ai_router.include_router(detection.router)
ai_router.include_router(copilot.router)
ai_router.include_router(explain.router)
ai_router.include_router(committee.router)
ai_router.include_router(baseline.router)
ai_router.include_router(multimodal.router)
ai_router.include_router(feedback.router)
ai_router.include_router(interactive_explain.router)
ai_router.include_router(monitoring.router)
ai_router.include_router(privacy.router)
ai_router.include_router(fairness.router)
