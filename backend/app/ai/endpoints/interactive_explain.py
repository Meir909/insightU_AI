from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.interactive_explain import (
    ExplainQuestion,
    ExplainResponse,
    WhatIfScenario,
    WhatIfResult,
    CounterfactualExample,
)
from app.ai.schemas.scoring import FinalScore, MultiDimensionalScore
from app.ai.services.interactive_explain import InteractiveExplainer

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/explain/interactive")
async def explain_interactive(
    question: ExplainQuestion,
    final_score: FinalScore,
    transcript: str
):
    """
    Answer committee's natural language questions about AI decisions.
    """
    logger.info(f"[ENDPOINT /explain/interactive] START | candidate={question.candidate_id}")

    try:
        result = await InteractiveExplainer.answer_committee_question(
            question=question,
            final_score=final_score,
            transcript=transcript
        )
        logger.info(f"[ENDPOINT /explain/interactive] DONE")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /explain/interactive] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


@router.post("/explain/what-if")
async def explain_what_if(
    scenario: WhatIfScenario,
    current_scores: MultiDimensionalScore
):
    """
    Show how scores would change under hypothetical conditions.
    """
    logger.info(f"[ENDPOINT /explain/what-if] START | candidate={scenario.candidate_id}")

    try:
        result = await InteractiveExplainer.what_if_analysis(scenario, current_scores)
        logger.info(f"[ENDPOINT /explain/what-if] DONE | delta={result.score_delta}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /explain/what-if] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


@router.post("/explain/counterfactual")
async def explain_counterfactual(
    candidate_id: str,
    target_dimension: str,
    current_score: float,
    transcript: str
):
    """
    Generate counterfactual example showing how to improve score.
    """
    logger.info(f"[ENDPOINT /explain/counterfactual] START | dim={target_dimension}")

    try:
        result = await InteractiveExplainer.generate_counterfactual(
            reference_candidate_id=candidate_id,
            comparison_transcript=transcript,
            target_dimension=target_dimension,
            current_score=current_score
        )
        logger.info(f"[ENDPOINT /explain/counterfactual] DONE")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /explain/counterfactual] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/explain/interactive
# Request:
# {
#   "question": {
#     "candidate_id": "cand_abc123",
#     "question": "Why is the soft skills score lower than I expected?",
#     "context": {}
#   },
#   "final_score": {...},
#   "transcript": "I led a team of 5 students..."
# }
# Response:
# {
#   "answer": "The soft skills score of 65 reflects limited evidence of empathy and conflict resolution. While the candidate mentioned leading a team, there were no specific examples of handling interpersonal challenges or supporting team members through difficulties.",
#   "referenced_evidence": ["I told them what to do and they did it"],
#   "confidence": 0.85,
#   "suggested_followup_questions": [
#     "Can you give an example of helping a struggling team member?",
#     "How did you handle disagreements in the team?"
#   ]
# }
#
# POST /ai/explain/what-if
# Request:
# {
#   "scenario": {
#     "candidate_id": "cand_abc123",
#     "hypothetical_change": "If the candidate had provided a specific example of mentoring a junior team member",
#     "dimension_to_analyze": "soft_skills"
#   },
#   "current_scores": {...}
# }
# Response:
# {
#   "original_score": 72.5,
#   "hypothetical_score": 78.3,
#   "score_delta": 5.8,
#   "explanation": "Mentoring evidence would raise soft skills from 65 to 75, demonstrating empathy and leadership development capabilities.",
#   "key_factors": ["empathy demonstration", "leadership development"],
#   "plausibility": 0.8
# }
