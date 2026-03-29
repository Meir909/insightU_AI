import logging
import statistics
from app.ai.config import ai_config
from app.ai.schemas.committee import (
    CommitteeVote,
    BiasCheckRequest,
    BiasCheckResult,
)

logger = logging.getLogger(__name__)


GENERIC_JUSTIFICATIONS = [
    "looks good", "seems fine", "not a good fit",
    "i agree", "good candidate", "bad candidate",
]


class BiasDetector:
    """
    Detects bias in committee voting using statistical analysis.
    """

    @staticmethod
    def detect_bias(request: BiasCheckRequest) -> BiasCheckResult:
        """
        Detect statistical anomalies in committee votes.
        """
        logger.info(f"[BiasDetector.detect_bias] START | candidate_id={request.candidate_id} votes={len(request.votes)}")

        scores = [v.score for v in request.votes]
        if len(scores) < 2:
            result = BiasCheckResult(
                candidate_id=request.candidate_id,
                has_anomaly=False,
                outlier_voters=[],
                z_scores={},
                score_variance=0,
                recommendation="insufficient_votes",
                details="Need at least 2 votes to check bias"
            )
            logger.info(f"[BiasDetector.detect_bias] DONE | insufficient votes")
            return result

        mean = statistics.mean(scores)
        std = statistics.stdev(scores) if len(scores) > 1 else 0

        z_scores = {}
        outliers = []
        for vote in request.votes:
            z = abs(vote.score - mean) / std if std > 0 else 0
            z_scores[vote.member_id] = round(z, 2)
            if z > ai_config.bias_zscore_threshold:
                outliers.append(vote.member_id)

        result = BiasCheckResult(
            candidate_id=request.candidate_id,
            has_anomaly=len(outliers) > 0,
            outlier_voters=outliers,
            z_scores=z_scores,
            score_variance=round(statistics.variance(scores), 2),
            recommendation="flag_for_review" if outliers else "normal",
            details=f"Mean: {mean:.1f}, Std: {std:.1f}. Outliers detected: {outliers}"
        )

        logger.info(f"[BiasDetector.detect_bias] DONE | has_anomaly={result.has_anomaly} outliers={len(outliers)}")
        return result


class VoteValidator:
    """
    Validates committee vote justifications.
    """

    @staticmethod
    def validate_justification(vote: CommitteeVote) -> dict:
        """
        Check that justification is at least 30 chars and not a generic phrase.
        """
        logger.info(f"[VoteValidator.validate_justification] START | member_id={vote.member_id}")

        text = vote.justification.lower().strip()
        is_generic = any(text == g for g in GENERIC_JUSTIFICATIONS)
        too_short = len(text) < 30

        result = {
            "valid": not is_generic and not too_short,
            "issues": [
                *("Too short" if too_short else []),
                *("Generic justification not accepted" if is_generic else []),
            ]
        }

        logger.info(f"[VoteValidator.validate_justification] DONE | valid={result['valid']}")
        return result
