from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from datetime import datetime, timezone

from app.ai.schemas.scoring import FinalScore
from app.ai.services.explain import ExplainabilityEngine

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


class ExplainRequest(BaseModel):
    candidate_id: str
    final_score: FinalScore


@router.post("/explain")
async def explain(request: ExplainRequest):
    """
    Generate an explainability report for a hiring decision.
    """
    logger.info(f"[ENDPOINT /explain] START | candidate_id={request.candidate_id}")

    try:
        result = await ExplainabilityEngine.generate(request.candidate_id, request.final_score)
        logger.info(f"[ENDPOINT /explain] DONE | candidate_id={request.candidate_id}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /explain] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/explain
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "final_score": {
#     "candidate_id": "cand_abc123",
#     "role": "student_leader",
#     "weighted_total": 78.5,
#     "dimensional_scores": {...},
#     "behavioral_signals": {...},
#     "cross_validation": {...},
#     "overall_confidence": 0.82,
#     "needs_manual_review": false,
#     "review_reasons": [],
#     "ensemble_breakdown": {...}
#   }
# }
# Response:
# {
#   "explanation": {
#     "verdict_summary": "Strong candidate with demonstrated leadership...",
#     "strengths": [
#       {"area": "Leadership", "evidence": "Led a team of 15 students..."},
#       {"area": "Communication", "evidence": "Articulated complex ideas clearly..."},
#       {"area": "Adaptability", "evidence": "Pivoted strategy when faced with..."}
#     ],
#     "concerns": [
#       {"area": "Technical depth", "evidence": "Limited discussion of technical implementation"}
#     ],
#     "recommendation": "yes",
#     "follow_up_topics": []
#   },
#   "generated_at": "2024-01-15T10:30:00Z",
#   "candidate_id": "cand_abc123"
# }
