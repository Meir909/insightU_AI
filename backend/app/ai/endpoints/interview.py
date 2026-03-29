from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.interview import InterviewAnalysisRequest, InterviewAnalysisResponse
from app.ai.services.interview import RealTimeInterviewAnalyzer

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/interview/analyze")
async def interview_analyze(request: InterviewAnalysisRequest):
    """
    Analyze a single interview answer in real-time.
    This should be FAST (< 3 seconds) — uses gpt-4o-mini.
    """
    logger.info(f"[ENDPOINT /interview/analyze] START | session_id={request.session_id}")

    try:
        result = await RealTimeInterviewAnalyzer.analyze_answer(request)
        logger.info(f"[ENDPOINT /interview/analyze] DONE | session_id={request.session_id}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /interview/analyze] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/interview/analyze
# Request:
# {
#   "session_id": "sess_abc123",
#   "candidate_id": "cand_xyz789",
#   "role": "student_leader",
#   "question": "Tell me about a time you led a team.",
#   "answer": "I organized a hackathon with 50 participants...",
#   "previous_qa": [],
#   "current_scores": null
# }
# Response:
# {
#   "session_id": "sess_abc123",
#   "analysis": {
#     "question": "Tell me about a time you led a team.",
#     "answer": "I organized a hackathon with 50 participants...",
#     "depth": "deep",
#     "depth_score": 0.85,
#     "thinking_style": "human_narrative",
#     "behavioral_signals": {"confidence": 0.9, "hesitation": 0.1, "evasiveness": 0.1},
#     "dimensional_deltas": {"hard_skills": 2, "soft_skills": 5, ...},
#     "weak_areas": [],
#     "strong_areas": ["leadership", "communication"]
#   },
#   "updated_scores": {"hard_skills": 52, "soft_skills": 55, ...},
#   "session_progress": 0.1
# }
