from fastapi import APIRouter

from app.services.candidate_service import analytics_summary

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/summary")
def analytics_route():
    return analytics_summary()
