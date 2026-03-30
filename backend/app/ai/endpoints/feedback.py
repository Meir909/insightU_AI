from fastapi import APIRouter, HTTPException
import logging
from typing import Optional

from app.ai.schemas.feedback import (
    CommitteeOverride,
    ScoreAdjustment,
    FeedbackSummary,
)
from app.ai.services.feedback import FeedbackCapture

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/feedback/override")
async def feedback_override(override: CommitteeOverride):
    """
    Record when committee disagrees with AI assessment.
    Used to improve AI over time.
    """
    logger.info(f"[ENDPOINT /feedback/override] START | candidate={override.candidate_id}")

    try:
        result = await FeedbackCapture.record_override(override)
        logger.info(f"[ENDPOINT /feedback/override] DONE | stored=True")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /feedback/override] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable, please retry")


@router.post("/feedback/adjustment")
async def feedback_adjustment(
    adjustment: ScoreAdjustment,
    candidate_id: str,
    member_id: str
):
    """
    Record proposed score adjustment for a specific dimension.
    """
    logger.info(f"[ENDPOINT /feedback/adjustment] START | dimension={adjustment.dimension}")

    try:
        result = await FeedbackCapture.record_adjustment(adjustment, candidate_id, member_id)
        logger.info(f"[ENDPOINT /feedback/adjustment] DONE")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /feedback/adjustment] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable, please retry")


@router.get("/feedback/summary")
async def feedback_summary(candidate_id: Optional[str] = None):
    """
    Get aggregated feedback statistics.
    """
    logger.info(f"[ENDPOINT /feedback/summary] START | candidate_filter={candidate_id}")

    try:
        summary = await FeedbackCapture.get_feedback_summary(candidate_id)
        logger.info(f"[ENDPOINT /feedback/summary] DONE")
        return summary

    except Exception as e:
        logger.error(f"[ENDPOINT /feedback/summary] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable, please retry")


@router.get("/feedback/member-bias/{member_id}")
async def member_bias(member_id: str):
    """
    Analyze if a committee member has systematic bias.
    """
    logger.info(f"[ENDPOINT /feedback/member-bias] START | member={member_id}")

    try:
        result = await FeedbackCapture.get_committee_member_bias(member_id)
        logger.info(f"[ENDPOINT /feedback/member-bias] DONE | bias_detected={result.get('bias_detected')}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /feedback/member-bias] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/feedback/override
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "committee_member_id": "mem_001",
#   "ai_score": 65.5,
#   "committee_score": 82.0,
#   "disagreement_type": "underscored",
#   "specific_dimensions": ["soft_skills", "adaptability"],
#   "committee_reasoning": "Candidate demonstrated strong leadership in crisis situation that AI missed",
#   "ai_missed_signals": ["crisis_leadership", "emotional_intelligence"],
#   "ai_false_positives": ["technical_depth"]
# }
# Response:
# {
#   "stored": true,
#   "score_difference": 16.5,
#   "direction": "committee_higher",
#   "disagreement_severity": "moderate"
# }
#
# GET /ai/feedback/summary
# Response:
# {
#   "total_overrides": 15,
#   "agreement_rate": 0.75,
#   "most_common_disagreement": "underscored",
#   "top_missed_signals": [["emotional_intelligence", 5], ["crisis_leadership", 3]],
#   "recommended_ai_tweaks": ["Improve detection of soft skills in stories"]
# }
