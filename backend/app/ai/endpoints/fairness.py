from fastapi import APIRouter, HTTPException
import logging
from typing import Dict, List

from app.ai.schemas.fairness import (
    FairnessAuditRequest,
    FairnessAuditResult,
)
from app.ai.services.fairness import FairnessAuditor

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/fairness/audit")
async def fairness_audit(request: FairnessAuditRequest):
    """
    Comprehensive fairness audit across demographic groups.
    
    Checks:
    - Disparate impact (80% rule)
    - Demographic parity
    - Group score distributions
    """
    logger.info(f"[ENDPOINT /fairness/audit] START | candidates={len(request.candidate_ids)}")

    try:
        result = await FairnessAuditor.comprehensive_audit(request)
        logger.info(f"[ENDPOINT /fairness/audit] DONE | score={result.overall_fairness_score:.3f}")
        return result

    except Exception as e:
        logger.error(f"[ENDPOINT /fairness/audit] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Fairness audit failed")


@router.post("/fairness/demographic-parity")
async def demographic_parity(
    candidate_ids: List[str],
    attribute_values: Dict[str, str]  # candidate_id -> attribute value (e.g., gender)
):
    """
    Quick demographic parity check.
    Compare score distributions across demographic groups.
    """
    logger.info(f"[ENDPOINT /fairness/demographic-parity] START | candidates={len(candidate_ids)}")

    try:
        result = await FairnessAuditor.demographic_parity_check(candidate_ids, attribute_values)
        logger.info(f"[ENDPOINT /fairness/demographic-parity] DONE | groups={len(result)}")
        return {
            "group_statistics": result,
            "parity_concerns": [
                f"{group}: mean={stats['mean_score']}"
                for group, stats in result.items()
                if stats.get('mean_score', 0) < 65
            ]
        }

    except Exception as e:
        logger.error(f"[ENDPOINT /fairness/demographic-parity] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="Parity check failed")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/fairness/audit
# Request:
# {
#   "candidate_ids": ["cand_1", "cand_2", "cand_3", ...],
#   "demographic_attributes": {
#     "cand_1": "female",
#     "cand_2": "male",
#     "cand_3": "female",
#     ...
#   },
#   "protected_attributes": ["gender"],
#   "score_threshold": 70.0
# }
# Response:
# {
#   "audit_timestamp": "2024-01-15T10:30:00Z",
#   "total_candidates": 150,
#   "group_metrics": [
#     {
#       "group": {"group_id": "female", "candidate_count": 80},
#       "mean_score": 74.2,
#       "selection_rate": 0.65,
#       "positive_outcome_rate": 0.35
#     },
#     {
#       "group": {"group_id": "male", "candidate_count": 70},
#       "mean_score": 76.8,
#       "selection_rate": 0.72,
#       "positive_outcome_rate": 0.42
#     }
#   ],
#   "disparate_impact_results": [
#     {
#       "reference_group": "male",
#       "comparison_group": "female",
#       "reference_rate": 0.42,
#       "comparison_rate": 0.35,
#       "ratio": 0.83,
#       "four_fifths_rule_violated": false,
#       "severity": "minor"
#     }
#   ],
#   "overall_fairness_score": 0.83,
#   "fairness_rating": "good",
#   "critical_issues": [],
#   "recommendations": ["Continue monitoring gender parity"]
# }
#
# POST /ai/fairness/demographic-parity
# Request:
# {
#   "candidate_ids": ["cand_1", "cand_2", ...],
#   "attribute_values": {
#     "cand_1": "urban",
#     "cand_2": "rural",
#     ...
#   }
# }
# Response:
# {
#   "group_statistics": {
#     "urban": {"count": 100, "mean_score": 76.5, "std": 8.2, "median": 77.0},
#     "rural": {"count": 50, "mean_score": 72.3, "std": 10.1, "median": 73.0}
#   },
#   "parity_concerns": ["rural: mean=72.3 (below 65 threshold)"]
# }
