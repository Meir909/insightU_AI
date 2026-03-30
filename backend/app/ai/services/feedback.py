import logging
from typing import Optional, List
from datetime import datetime, timezone
from collections import defaultdict, Counter

from app.ai.schemas.feedback import (
    CommitteeOverride,
    ScoreAdjustment,
    FeedbackSummary,
)
from app.services.repository import get_store

logger = logging.getLogger(__name__)


class FeedbackStore:
    """Simple local storage for feedback data."""
    
    @staticmethod
    def _load_feedback():
        state = get_store().load()
        if not hasattr(state, 'ai_feedback'):
            state.ai_feedback = {
                "overrides": [],
                "calibrations": [],
                "adjustments": [],
            }
        return state.ai_feedback
    
    @staticmethod
    def _save_feedback(feedback_data):
        state = get_store().load()
        state.ai_feedback = feedback_data
        get_store().save(state)


class FeedbackCapture:
    """
    Capture and analyze committee feedback to improve AI over time.
    """

    @staticmethod
    async def record_override(override: CommitteeOverride) -> dict:
        """
        Record when committee overrides AI decision.
        """
        logger.info(f"[FeedbackCapture.record_override] START | candidate={override.candidate_id} member={override.committee_member_id}")

        feedback = FeedbackStore._load_feedback()
        
        # Store the override
        override_dict = override.model_dump()
        override_dict["recorded_at"] = datetime.now(timezone.utc).isoformat()
        feedback["overrides"].append(override_dict)
        FeedbackStore._save_feedback(feedback)

        # Calculate immediate insights
        score_diff = abs(override.committee_score - override.ai_score)
        
        result = {
            "stored": True,
            "score_difference": round(score_diff, 2),
            "direction": "committee_higher" if override.committee_score > override.ai_score else "committee_lower",
            "disagreement_severity": "minor" if score_diff < 15 else "moderate" if score_diff < 30 else "major",
        }

        logger.info(f"[FeedbackCapture.record_override] DONE | severity={result['disagreement_severity']}")
        return result

    @staticmethod
    async def record_adjustment(adjustment: ScoreAdjustment, candidate_id: str, member_id: str) -> dict:
        """
        Record proposed score adjustment for a dimension.
        """
        logger.info(f"[FeedbackCapture.record_adjustment] START | dimension={adjustment.dimension}")

        feedback = FeedbackStore._load_feedback()
        adjustment_dict = adjustment.model_dump()
        adjustment_dict["candidate_id"] = candidate_id
        adjustment_dict["member_id"] = member_id
        adjustment_dict["recorded_at"] = datetime.now(timezone.utc).isoformat()
        feedback["adjustments"].append(adjustment_dict)
        FeedbackStore._save_feedback(feedback)

        logger.info(f"[FeedbackCapture.record_adjustment] DONE | delta={adjustment.proposed_score - adjustment.original_ai_score:.2f}")
        return {"stored": True}

    @staticmethod
    async def get_feedback_summary(candidate_id: Optional[str] = None) -> FeedbackSummary:
        """
        Get aggregated feedback statistics.
        """
        logger.info(f"[FeedbackCapture.get_feedback_summary] START | candidate_filter={candidate_id}")

        feedback = FeedbackStore._load_feedback()
        overrides = feedback.get("overrides", [])
        
        if candidate_id:
            overrides = [o for o in overrides if o.get("candidate_id") == candidate_id]

        total = len(overrides)
        if total == 0:
            return FeedbackSummary(
                total_overrides=0,
                agreement_rate=1.0,
                most_common_disagreement="none",
                top_missed_signals=[],
                recommended_ai_tweaks=[],
            )

        # Calculate agreement rate (difference < 10 points = agreement)
        agreements = sum(1 for o in overrides if abs(o.get("committee_score", 0) - o.get("ai_score", 0)) < 10)
        agreement_rate = agreements / total

        # Most common disagreement type
        disagreement_types = Counter(o.get("disagreement_type", "other") for o in overrides)
        most_common = disagreement_types.most_common(1)[0][0] if disagreement_types else "none"

        # Top missed signals
        all_missed = []
        for o in overrides:
            all_missed.extend(o.get("ai_missed_signals", []))
        top_missed = Counter(all_missed).most_common(5)

        # Recommendations based on patterns
        tweaks = []
        if disagreement_types.get("overscored", 0) > total * 0.3:
            tweaks.append("AI may be over-optimistic; consider lowering default scores")
        if disagreement_types.get("underscored", 0) > total * 0.3:
            tweaks.append("AI may be too harsh; review penalty thresholds")
        if "technical_skills" in [s for s, _ in top_missed]:
            tweaks.append("Improve detection of technical competence signals")

        summary = FeedbackSummary(
            total_overrides=total,
            agreement_rate=round(agreement_rate, 3),
            most_common_disagreement=most_common,
            top_missed_signals=top_missed,
            recommended_ai_tweaks=tweaks,
        )

        logger.info(f"[FeedbackCapture.get_feedback_summary] DONE | overrides={total} agreement={agreement_rate:.2%}")
        return summary

    @staticmethod
    async def get_committee_member_bias(member_id: str) -> dict:
        """
        Analyze if a specific committee member is systematically biased.
        """
        logger.info(f"[FeedbackCapture.get_committee_member_bias] START | member={member_id}")

        feedback = FeedbackStore._load_feedback()
        member_overrides = [
            o for o in feedback.get("overrides", [])
            if o.get("committee_member_id") == member_id
        ]

        if len(member_overrides) < 3:
            return {
                "member_id": member_id,
                "bias_detected": False,
                "reason": "insufficient_data",
                "samples": len(member_overrides),
            }

        # Calculate tendency
        diffs = [o.get("committee_score", 50) - o.get("ai_score", 50) for o in member_overrides]
        avg_diff = sum(diffs) / len(diffs)

        bias_type = None
        if avg_diff > 15:
            bias_type = "overly_generous"
        elif avg_diff < -15:
            bias_type = "overly_strict"

        return {
            "member_id": member_id,
            "bias_detected": bias_type is not None,
            "bias_type": bias_type,
            "average_deviation": round(avg_diff, 2),
            "samples": len(member_overrides),
            "recommendation": "recalibration_needed" if bias_type else "normal",
        }
