from fastapi import APIRouter, HTTPException
import logging

from app.ai.schemas.committee import CommitteeVote, BiasCheckRequest, BiasCheckResult
from app.ai.services.committee import BiasDetector, VoteValidator
from app.services.repository import get_store
from app.security import now_utc

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/committee/bias-check")
async def committee_bias_check(request: BiasCheckRequest):
    """
    Check for bias/anomalies in committee votes.
    """
    logger.info(f"[ENDPOINT /committee/bias-check] START | candidate_id={request.candidate_id}")

    try:
        result = BiasDetector.detect_bias(request)
        logger.info(f"[ENDPOINT /committee/bias-check] DONE | candidate_id={request.candidate_id} has_anomaly={result.has_anomaly}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /committee/bias-check] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable, please retry")


@router.post("/committee/vote")
async def committee_vote(vote: CommitteeVote):
    """
    Submit a committee vote with validation.
    If >= 3 votes for this candidate, automatically trigger bias check.
    """
    logger.info(f"[ENDPOINT /committee/vote] START | candidate_id={vote.candidate_id} member_id={vote.member_id}")

    try:
        # 1. Validate justification
        validation = VoteValidator.validate_justification(vote)

        if not validation["valid"]:
            logger.warning(f"[ENDPOINT /committee/vote] INVALID | issues={validation['issues']}")
            return {
                "accepted": False,
                "issues": validation["issues"],
                "stored": False,
            }

        # 2. Store vote (update existing DB)
        store = get_store()
        state = store.load()

        from app.models import CommitteeVote as CommitteeVoteModel
        vote_model = CommitteeVoteModel(
            member_id=vote.member_id,
            member_name=vote.member_id,  # Simplified - should lookup name
            decision=vote.vote,  # Map vote to decision
            rationale=vote.justification,
            created_at=now_utc(),
        )

        votes = state.committee_votes.setdefault(vote.candidate_id, [])
        filtered = [v for v in votes if v.member_id != vote.member_id]
        filtered.append(vote_model)
        state.committee_votes[vote.candidate_id] = filtered
        store.save(state)

        # 3. If >= 3 votes, trigger bias check
        bias_check_result = None
        if len(filtered) >= 3:
            from app.ai.schemas.committee import CommitteeVote as CommitteeVoteSchema
            bias_request = BiasCheckRequest(
                candidate_id=vote.candidate_id,
                votes=[
                    CommitteeVoteSchema(
                        member_id=v.member_id,
                        candidate_id=vote.candidate_id,
                        vote=v.decision,
                        score=75 if v.decision == "approve" else (25 if v.decision == "reject" else 50),
                        justification=v.rationale,
                    )
                    for v in filtered
                ],
            )
            bias_check_result = BiasDetector.detect_bias(bias_request)
            logger.info(f"[ENDPOINT /committee/vote] AUTO_BIAS_CHECK | has_anomaly={bias_check_result.has_anomaly}")

        logger.info(f"[ENDPOINT /committee/vote] DONE | candidate_id={vote.candidate_id} stored=True")
        return {
            "accepted": True,
            "issues": [],
            "stored": True,
            "total_votes": len(filtered),
            "bias_check": bias_check_result.model_dump() if bias_check_result else None,
        }

    except Exception as e:
        logger.error(f"[ENDPOINT /committee/vote] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/committee/bias-check
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "votes": [
#     {"member_id": "mem_1", "candidate_id": "cand_abc123", "vote": "approve", "score": 85, "justification": "..."},
#     {"member_id": "mem_2", "candidate_id": "cand_abc123", "vote": "approve", "score": 82, "justification": "..."},
#     {"member_id": "mem_3", "candidate_id": "cand_abc123", "vote": "reject", "score": 35, "justification": "..."}
#   ]
# }
# Response:
# {
#   "candidate_id": "cand_abc123",
#   "has_anomaly": true,
#   "outlier_voters": ["mem_3"],
#   "z_scores": {"mem_1": 0.87, "mem_2": 0.43, "mem_3": 2.1},
#   "score_variance": 642.33,
#   "recommendation": "flag_for_review",
#   "details": "Mean: 67.3, Std: 25.3. Outliers detected: ['mem_3']"
# }
#
# POST /ai/committee/vote
# Request:
# {
#   "member_id": "mem_4",
#   "candidate_id": "cand_abc123",
#   "vote": "approve",
#   "score": 88,
#   "justification": "Excellent communication skills and leadership experience demonstrated throughout the interview."
# }
# Response:
# {
#   "accepted": true,
#   "issues": [],
#   "stored": true,
#   "total_votes": 4,
#   "bias_check": {...}  # Only if >= 3 votes
# }
