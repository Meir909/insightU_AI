import logging
import statistics
from typing import List, Optional
from datetime import datetime, timezone
from collections import defaultdict

from app.ai.schemas.monitoring import (
    ScoreDistribution,
    DriftDetectionResult,
    ConfidenceTrend,
    HumanAIAgreementMetrics,
    ModelHealthMetrics,
)
from app.ai.services.feedback import FeedbackCapture
from app.services.repository import get_store

logger = logging.getLogger(__name__)


class ModelMonitor:
    """
    Monitor AI model performance, detect drift, and track health metrics.
    """

    @staticmethod
    def _calculate_distribution(scores: List[float]) -> ScoreDistribution:
        """Calculate distribution statistics."""
        if not scores:
            return ScoreDistribution(
                mean=0, median=0, std=0, min=0, max=0,
                percentile_25=0, percentile_75=0, sample_size=0
            )
        
        sorted_scores = sorted(scores)
        n = len(sorted_scores)
        
        return ScoreDistribution(
            mean=round(statistics.mean(scores), 2),
            median=round(statistics.median(scores), 2),
            std=round(statistics.stdev(scores) if n > 1 else 0, 2),
            min=min(scores),
            max=max(scores),
            percentile_25=sorted_scores[n // 4] if n > 0 else 0,
            percentile_75=sorted_scores[3 * n // 4] if n > 0 else 0,
            sample_size=n,
        )

    @staticmethod
    def _ks_test(sample1: List[float], sample2: List[float]) -> tuple[float, float]:
        """
        Simple Kolmogorov-Smirnov test implementation.
        Returns (ks_statistic, p_value_approximation).
        """
        if not sample1 or not sample2:
            return 0.0, 1.0
        
        # Combine and sort all observations
        all_data = sorted(set(sample1 + sample2))
        
        # Calculate ECDFs
        def ecdf(sample, x):
            return sum(1 for s in sample if s <= x) / len(sample)
        
        # Find maximum difference
        max_diff = 0
        for x in all_data:
            diff = abs(ecdf(sample1, x) - ecdf(sample2, x))
            max_diff = max(max_diff, diff)
        
        # Approximate p-value (simplified)
        n1, n2 = len(sample1), len(sample2)
        # Critical value approximation
        critical = 1.36 * ((n1 + n2) / (n1 * n2)) ** 0.5 if n1 * n2 > 0 else 0
        p_value = 0.05 if max_diff > critical else 0.5
        
        return max_diff, p_value

    @staticmethod
    def _calculate_psi(expected: List[float], actual: List[float], bins: int = 10) -> float:
        """
        Calculate Population Stability Index.
        PSI < 0.1: no change
        0.1 <= PSI < 0.25: moderate change
        PSI >= 0.25: significant change
        """
        if not expected or not actual:
            return 0.0
        
        # Create bins
        min_val = min(min(expected), min(actual))
        max_val = max(max(expected), max(actual))
        bin_edges = [min_val + (max_val - min_val) * i / bins for i in range(bins + 1)]
        
        # Calculate proportions
        def get_proportions(data, edges):
            props = []
            for i in range(len(edges) - 1):
                count = sum(1 for d in data if edges[i] <= d < edges[i + 1])
                props.append(max(count / len(data), 0.001))  # Avoid zero
            return props
        
        expected_props = get_proportions(expected, bin_edges)
        actual_props = get_proportions(actual, bin_edges)
        
        # Calculate PSI
        psi = sum((a - e) * (a / e) for e, a in zip(expected_props, actual_props))
        return round(psi, 3)

    @staticmethod
    async def detect_score_drift(
        reference_scores: List[float],
        current_scores: List[float]
    ) -> DriftDetectionResult:
        """
        Detect if score distribution has drifted.
        """
        logger.info(f"[ModelMonitor.detect_score_drift] START | ref={len(reference_scores)} cur={len(current_scores)}")

        ref_dist = ModelMonitor._calculate_distribution(reference_scores)
        cur_dist = ModelMonitor._calculate_distribution(current_scores)

        # KS test
        ks_stat, p_value = ModelMonitor._ks_test(reference_scores, current_scores)
        
        # PSI
        psi = ModelMonitor._calculate_psi(reference_scores, current_scores)

        # Determine severity
        if psi < 0.1 and p_value > 0.05:
            severity = "none"
            drift_detected = False
        elif psi < 0.25 or p_value > 0.01:
            severity = "low"
            drift_detected = False
        elif psi < 0.35:
            severity = "medium"
            drift_detected = True
        else:
            severity = "high"
            drift_detected = True

        recommendation = "No action needed" if not drift_detected else \
                          "Monitor closely and consider retraining" if severity == "medium" else \
                          "Immediate review required - model may need recalibration"

        result = DriftDetectionResult(
            drift_detected=drift_detected,
            drift_type="score_distribution",
            severity=severity,
            reference_stats=ref_dist,
            current_stats=cur_dist,
            p_value=p_value,
            ks_statistic=ks_stat,
            psi_score=psi,
            recommendation=recommendation,
        )

        logger.info(f"[ModelMonitor.detect_score_drift] DONE | drift={drift_detected} severity={severity}")
        return result

    @staticmethod
    async def get_confidence_trend(
        recent_candidates: int = 30
    ) -> ConfidenceTrend:
        """
        Analyze confidence trend in recent predictions.
        """
        logger.info(f"[ModelMonitor.get_confidence_trend] START | n={recent_candidates}")

        # Load recent scores from store
        state = get_store().load()
        sessions = state.interview_sessions[-recent_candidates:] if hasattr(state, 'interview_sessions') else []
        
        confidences = []
        for session in sessions:
            if session.score_update and session.score_update.confidence:
                confidences.append(session.score_update.confidence)

        if not confidences:
            return ConfidenceTrend(
                period=f"last_{recent_candidates}_candidates",
                avg_confidence=0.5,
                trend_direction="stable",
                confidence_std=0,
                low_confidence_rate=0.0,
            )

        avg_conf = statistics.mean(confidences)
        low_conf_rate = sum(1 for c in confidences if c < 0.5) / len(confidences)
        
        # Simple trend detection (compare first half to second half)
        mid = len(confidences) // 2
        if mid > 0:
            first_half = statistics.mean(confidences[:mid])
            second_half = statistics.mean(confidences[mid:])
            diff = second_half - first_half
            trend = "increasing" if diff > 0.1 else "decreasing" if diff < -0.1 else "stable"
        else:
            trend = "stable"

        result = ConfidenceTrend(
            period=f"last_{recent_candidates}_candidates",
            avg_confidence=round(avg_conf, 3),
            trend_direction=trend,
            confidence_std=round(statistics.stdev(confidences) if len(confidences) > 1 else 0, 3),
            low_confidence_rate=round(low_conf_rate, 3),
        )

        logger.info(f"[ModelMonitor.get_confidence_trend] DONE | avg={avg_conf:.3f} trend={trend}")
        return result

    @staticmethod
    async def get_human_ai_agreement() -> HumanAIAgreementMetrics:
        """
        Calculate agreement between AI and committee.
        """
        logger.info("[ModelMonitor.get_human_ai_agreement] START")

        # Get feedback data
        feedback_summary = await FeedbackCapture.get_feedback_summary()
        
        # Try to load more detailed comparison data
        state = get_store().load()
        total_evaluated = feedback_summary.total_overrides + int(feedback_summary.agreement_rate * 100)
        
        # Calculate systematic bias
        if feedback_summary.agreement_rate > 0.8:
            bias = "none"
        elif feedback_summary.most_common_disagreement == "overscored":
            bias = "ai_higher"
        elif feedback_summary.most_common_disagreement == "underscored":
            bias = "ai_lower"
        else:
            bias = "mixed"

        result = HumanAIAgreementMetrics(
            total_evaluated=total_evaluated,
            agreement_rate=round(feedback_summary.agreement_rate, 3),
            average_difference=0.0,  # Would need detailed diff tracking
            correlation_coefficient=None,  # Would need paired data
            systematic_bias=bias,
        )

        logger.info(f"[ModelMonitor.get_human_ai_agreement] DONE | agreement={result.agreement_rate:.1%}")
        return result

    @staticmethod
    async def get_model_health() -> ModelHealthMetrics:
        """
        Get comprehensive model health metrics.
        """
        logger.info("[ModelMonitor.get_model_health] START")

        # Load historical data
        state = get_store().load()
        
        # Score distribution
        all_scores = []
        if hasattr(state, 'interview_sessions'):
            for session in state.interview_sessions:
                if session.score_update and session.score_update.final_score:
                    all_scores.append(session.score_update.final_score)

        # Split into reference (first 70%) and current (last 30%) for drift detection
        split_point = int(len(all_scores) * 0.7) if len(all_scores) > 20 else 0
        reference_scores = all_scores[:split_point] if split_point > 10 else all_scores
        current_scores = all_scores[split_point:] if len(all_scores) - split_point > 10 else all_scores

        # Get all metrics
        score_dist = ModelMonitor._calculate_distribution(all_scores)
        drift = await ModelMonitor.detect_score_drift(reference_scores, current_scores)
        confidence = await ModelMonitor.get_confidence_trend()
        agreement = await ModelMonitor.get_human_ai_agreement()

        # Determine overall health
        warnings = []
        recommendations = []
        
        if drift.drift_detected:
            warnings.append(f"Score drift detected: {drift.severity} severity")
            recommendations.append("Review recent candidates for data quality issues")
        
        if confidence.low_confidence_rate > 0.3:
            warnings.append(f"High low-confidence rate: {confidence.low_confidence_rate:.1%}")
            recommendations.append("Consider model retraining or feature engineering")
        
        if agreement.agreement_rate < 0.6:
            warnings.append(f"Low human-AI agreement: {agreement.agreement_rate:.1%}")
            recommendations.append("Schedule calibration session with committee")
        
        if confidence.trend_direction == "decreasing":
            warnings.append("Confidence trend is decreasing")
            recommendations.append("Investigate input quality or model degradation")

        if len(warnings) == 0:
            overall_health = "healthy"
        elif len(warnings) <= 2:
            overall_health = "degraded"
        else:
            overall_health = "critical"

        result = ModelHealthMetrics(
            timestamp=datetime.now(timezone.utc),
            model_version="v2.0",
            score_distribution=score_dist,
            drift_status=drift,
            confidence_trend=confidence,
            human_ai_agreement=agreement,
            overall_health=overall_health,
            warnings=warnings,
            recommendations=recommendations,
        )

        logger.info(f"[ModelMonitor.get_model_health] DONE | health={overall_health} warnings={len(warnings)}")
        return result
