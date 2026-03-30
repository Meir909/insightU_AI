from fastapi import APIRouter, HTTPException
import logging
from typing import List, Optional

from app.ai.schemas.monitoring import (
    DriftDetectionResult,
    ConfidenceTrend,
    HumanAIAgreementMetrics,
    ModelHealthMetrics,
)
from app.ai.services.monitoring import ModelMonitor

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.get("/monitoring/health")
async def monitoring_health() -> ModelHealthMetrics:
    """
    Get comprehensive model health metrics.
    Includes drift detection, confidence trends, and human-AI agreement.
    """
    logger.info("[ENDPOINT /monitoring/health] START")

    try:
        result = await ModelMonitor.get_model_health()
        logger.info(f"[ENDPOINT /monitoring/health] DONE | health={result.overall_health}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /monitoring/health] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Monitoring service unavailable")


@router.post("/monitoring/drift-check")
async def monitoring_drift(
    reference_scores: List[float],
    current_scores: List[float]
) -> DriftDetectionResult:
    """
    Check for score distribution drift between reference and current data.
    """
    logger.info(f"[ENDPOINT /monitoring/drift-check] START | ref={len(reference_scores)} cur={len(current_scores)}")

    try:
        result = await ModelMonitor.detect_score_drift(reference_scores, current_scores)
        logger.info(f"[ENDPOINT /monitoring/drift-check] DONE | drift={result.drift_detected}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /monitoring/drift-check] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Drift detection failed")


@router.get("/monitoring/confidence-trend")
async def monitoring_confidence(
    recent_candidates: int = 30
) -> ConfidenceTrend:
    """
    Get AI confidence trend over recent candidates.
    """
    logger.info(f"[ENDPOINT /monitoring/confidence-trend] START | n={recent_candidates}")

    try:
        result = await ModelMonitor.get_confidence_trend(recent_candidates)
        logger.info(f"[ENDPOINT /monitoring/confidence-trend] DONE | trend={result.trend_direction}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /monitoring/confidence-trend] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Confidence analysis failed")


@router.get("/monitoring/human-ai-agreement")
async def monitoring_agreement() -> HumanAIAgreementMetrics:
    """
    Get metrics on human-AI agreement.
    """
    logger.info("[ENDPOINT /monitoring/human-ai-agreement] START")

    try:
        result = await ModelMonitor.get_human_ai_agreement()
        logger.info(f"[ENDPOINT /monitoring/human-ai-agreement] DONE | agreement={result.agreement_rate:.1%}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /monitoring/human-ai-agreement] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Agreement analysis failed")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# GET /ai/monitoring/health
# Response:
# {
#   "timestamp": "2024-01-15T10:30:00Z",
#   "model_version": "v2.0",
#   "score_distribution": {
#     "mean": 72.5,
#     "median": 74.0,
#     "std": 12.3,
#     "sample_size": 150
#   },
#   "drift_status": {
#     "drift_detected": false,
#     "severity": "none",
#     "psi_score": 0.08,
#     "recommendation": "No action needed"
#   },
#   "confidence_trend": {
#     "avg_confidence": 0.78,
#     "trend_direction": "stable",
#     "low_confidence_rate": 0.15
#   },
#   "human_ai_agreement": {
#     "agreement_rate": 0.75,
#     "systematic_bias": "none"
#   },
#   "overall_health": "healthy",
#   "warnings": [],
#   "recommendations": []
# }
#
# POST /ai/monitoring/drift-check
# Request:
# {
#   "reference_scores": [70, 72, 68, 75, 80, ...],
#   "current_scores": [65, 63, 60, 62, 58, ...]
# }
# Response:
# {
#   "drift_detected": true,
#   "severity": "high",
#   "psi_score": 0.35,
#   "recommendation": "Immediate review required - model may need recalibration"
# }
