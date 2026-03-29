from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.detection import (
    AIDetectionRequest,
    AIDetectionResult,
    ResourceValidationRequest,
    ResourceValidationResult,
)
from app.ai.services.detection import AIContentDetector, AuthenticityChecker

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/risk/ai-detection")
async def ai_detection(request: AIDetectionRequest):
    """
    Detect AI-generated content in text.
    """
    logger.info(f"[ENDPOINT /risk/ai-detection] START | text_id={request.text_id}")

    try:
        result = await AIContentDetector.detect(request)
        logger.info(f"[ENDPOINT /risk/ai-detection] DONE | text_id={request.text_id} verdict={result.verdict}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /risk/ai-detection] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


@router.post("/resource/validate")
async def resource_validate(request: ResourceValidationRequest):
    """
    Validate candidate resources (GitHub, portfolio, etc.) for authenticity.
    """
    logger.info(f"[ENDPOINT /resource/validate] START | candidate_id={request.candidate_id}")

    try:
        result = await AuthenticityChecker.validate_resources(request)
        logger.info(f"[ENDPOINT /resource/validate] DONE | candidate_id={request.candidate_id}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /resource/validate] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/risk/ai-detection
# Request:
# {
#   "text_id": "txt_abc123",
#   "text": "I am passionate about technology and innovation..."
# }
# Response:
# {
#   "text_id": "txt_abc123",
#   "final_probability": 0.23,
#   "verdict": "likely_human",
#   "signals": {
#     "entropy_score": 0.85,
#     "burstiness": 0.72,
#     "lexical_diversity": 0.68,
#     "over_structured": false,
#     "unnatural_perfection": false,
#     "template_phrases_found": [],
#     "llm_verdict_probability": 0.15
#   },
#   "used_fallback": false
# }
#
# POST /ai/resource/validate
# Request:
# {
#   "candidate_id": "cand_xyz789",
#   "github_url": "https://github.com/johndoe",
#   "portfolio_url": "https://johndoe.dev"
# }
# Response:
# {
#   "candidate_id": "cand_xyz789",
#   "github_valid": true,
#   "github_activity_score": 75.0,
#   "portfolio_reachable": true,
#   "overall_authenticity_score": 87.5,
#   "red_flags": [],
#   "notes": "GitHub: 12 repos, 45 followers; Portfolio URL is reachable"
# }
