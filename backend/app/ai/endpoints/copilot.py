from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.copilot import (
    FollowUpRequest,
    FollowUpResponse,
    ThinkingStyleRequest,
    ThinkingStyleResult,
)
from app.ai.services.copilot import FollowUpGenerator, ThinkingStyleAnalyzer

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/copilot/question")
async def copilot_question(request: FollowUpRequest):
    """
    Generate a follow-up interview question based on weak areas and current scores.
    """
    logger.info(f"[ENDPOINT /copilot/question] START | session_id={request.session_id}")

    try:
        result = await FollowUpGenerator.suggest_question(request)
        logger.info(f"[ENDPOINT /copilot/question] DONE | session_id={request.session_id}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /copilot/question] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


@router.post("/thinking/analyze")
async def thinking_analyze(request: ThinkingStyleRequest):
    """
    Analyze thinking style in the provided text.
    """
    logger.info(f"[ENDPOINT /thinking/analyze] START | text_length={len(request.text)}")

    try:
        result = await ThinkingStyleAnalyzer.analyze(request)
        logger.info(f"[ENDPOINT /thinking/analyze] DONE | style={result.thinking_style}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /thinking/analyze] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/copilot/question
# Request:
# {
#   "session_id": "sess_abc123",
#   "role": "student_leader",
#   "previous_qa": [
#     {"question": "Tell me about yourself", "answer": "I am a student..."}
#   ],
#   "weak_areas": ["problem_solving"],
#   "current_scores": {"hard_skills": 45, "soft_skills": 72, ...}
# }
# Response:
# {
#   "session_id": "sess_abc123",
#   "suggested_question": "Describe a complex problem you solved recently.",
#   "target_dimension": "problem_solving",
#   "reasoning": "Candidate showed weakness in problem_solving dimension",
#   "urgency": "critical"
# }
#
# POST /ai/thinking/analyze
# Request:
# {
#   "text": "I think the best approach is to analyze the data first..."
# }
# Response:
# {
#   "thinking_style": "human_analytical",
#   "human_markers": ["data references", "structured approach"],
#   "ai_markers": [],
#   "confidence": 0.85
# }
