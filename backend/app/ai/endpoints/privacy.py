from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.privacy import PrivacyScoringRequest, PrivacyScoringResult
from app.ai.services.privacy import PrivacyPreservingScorer

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/score/privacy")
async def score_privacy(request: PrivacyScoringRequest):
    """
    Privacy-preserving candidate scoring.
    
    Levels:
    - standard: Normal processing
    - anonymized: Remove PII before AI processing
    - differential_privacy: Add noise for privacy guarantees
    """
    logger.info(f"[ENDPOINT /score/privacy] START | candidate={request.candidate_id} level={request.privacy_level}")

    try:
        result = await PrivacyPreservingScorer.privacy_score(request)
        logger.info(f"[ENDPOINT /score/privacy] DONE | level={request.privacy_level}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /score/privacy] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Privacy scoring service unavailable")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/score/privacy
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "interview_transcript": "I led a team of 5 students at School #42 in Almaty...",
#   "essay_text": "My email is student@gmail.com and phone is +77001234567...",
#   "privacy_level": "differential_privacy",
#   "epsilon": 1.0,
#   "anonymization_config": {
#     "remove_names": true,
#     "remove_emails": true,
#     "remove_phones": true
#   }
# }
# Response:
# {
#   "candidate_id": "cand_abc123",
#   "privacy_level": "differential_privacy",
#   "anonymization_info": {
#     "original_length": 1250,
#     "anonymized_length": 1180,
#     "entities_removed": {"email": 1, "phone": 1, "name": 2},
#     "sample_before": "I led a team of 5 students at School #42 in Almaty...",
#     "sample_after": "I led a team of 5 students at [REDACTED]..."
#   },
#   "hard_skills": 72.3,
#   "soft_skills": 81.1,
#   "problem_solving": 77.9,
#   "communication": 75.2,
#   "adaptability": 78.5,
#   "overall_score": 77.0,
#   "noise_added": 2.4,
#   "epsilon_used": 1.0,
#   "confidence": 0.68,
#   "privacy_guarantee": "ε-differential privacy with ε=1.0. Noise added to protect individual privacy.",
#   "data_residency": "processed_locally",
#   "third_party_access": ["openai_api"]
# }
