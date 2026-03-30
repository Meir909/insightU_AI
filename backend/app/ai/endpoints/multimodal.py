from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.multimodal import MultiModalFusionRequest, MultiModalFusionResult
from app.ai.services.multimodal import MultiModalFusion

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/score/fusion")
async def score_fusion(request: MultiModalFusionRequest):
    """
    Multi-modal fusion scoring combining form, essay, interview, and behavioral data.
    Weights are dynamically adjusted based on available data.
    """
    logger.info(f"[ENDPOINT /score/fusion] START | candidate_id={request.candidate_id}")

    try:
        result = await MultiModalFusion.fusion_score(request)
        logger.info(f"[ENDPOINT /score/fusion] DONE | candidate_id={request.candidate_id}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /score/fusion] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/score/fusion
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "form_data": {
#     "education_level": "bachelor",
#     "years_experience": 2,
#     "previous_roles": ["team_lead", "volunteer"],
#     "skills_declared": ["python", "leadership"],
#     "achievements_count": 3,
#     "references_provided": true,
#     "completion_time_seconds": 1800
#   },
#   "essay_text": "I want to change education in Kazakhstan...",
#   "interview_transcript": "I led a team of 5 students to build...",
#   "behavioral_meta": {
#     "form_completion_time_ms": 1800000,
#     "edit_count": 5,
#     "session_duration_minutes": 45.5,
#     "device_type": "desktop"
#   }
# }
# Response:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "final_scores": {
#     "hard_skills": 72.5,
#     "soft_skills": 81.3,
#     "problem_solving": 78.2,
#     "communication": 75.8,
#     "adaptability": 79.1
#   },
#   "overall_score": 77.38,
#   "per_modality": [...],
#   "fusion_weights": {
#     "form": 0.15,
#     "essay": 0.25,
#     "interview": 0.50,
#     "behavioral": 0.10
#   },
#   "data_quality_score": 0.85,
#   "recommendation": "promising"
# }
