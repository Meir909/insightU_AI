from fastapi import APIRouter, HTTPException
import logging
from typing import Optional

from app.ai.schemas.scoring import MultiDimensionalRequest
from app.ai.services.baseline import BaselineScorer
from app.ai.services.ensemble import EnsembleEngine

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/compare/baseline")
async def compare_baseline(request: MultiDimensionalRequest):
    """
    Compare AI scoring with simple keyword-based baseline.
    Demonstrates value of AI over basic heuristics.
    """
    logger.info(f"[ENDPOINT /compare/baseline] START | candidate_id={request.candidate_id}")

    try:
        # Get baseline scores
        baseline_result = BaselineScorer.score_candidate(
            transcript=request.interview_transcript,
            essay=request.essay_text
        )

        # Get AI scores
        ensemble_result = await EnsembleEngine.run(request)
        ai_scores = ensemble_result["scores"]

        # Compare
        comparison = BaselineScorer.compare_with_ai(baseline_result, ai_scores)

        logger.info(f"[ENDPOINT /compare/baseline] DONE | candidate_id={request.candidate_id}")
        return {
            "candidate_id": request.candidate_id,
            "role": request.role,
            "baseline": baseline_result,
            "ai": {
                "scores": {
                    "hard_skills": ai_scores.hard_skills.score,
                    "soft_skills": ai_scores.soft_skills.score,
                    "problem_solving": ai_scores.problem_solving.score,
                    "communication": ai_scores.communication.score,
                    "adaptability": ai_scores.adaptability.score,
                },
                "overall_score": comparison["ai_overall"],
            },
            "comparison": comparison,
            "winner": "ai" if comparison["overall_difference"] > 0 else "baseline",
        }

    except Exception as e:
        logger.error(f"[ENDPOINT /compare/baseline] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/compare/baseline
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "interview_transcript": "I led a team of 5 students to build a project...",
#   "essay_text": "My goal is to change education..."
# }
# Response:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "baseline": {
#     "method": "keyword_baseline",
#     "overall_score": 45.5,
#     "scores": {"hard_skills": 30, "soft_skills": 60, ...}
#   },
#   "ai": {
#     "overall_score": 78.5,
#     "scores": {"hard_skills": 65, "soft_skills": 82, ...}
#   },
#   "comparison": {
#     "overall_difference": 33.0,
#     "value_add": "AI understands context...",
#     "per_dimension": {...}
#   },
#   "winner": "ai"
# }
