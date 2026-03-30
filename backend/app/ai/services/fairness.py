import logging
import statistics
from typing import Dict, List, Optional
from collections import defaultdict
from datetime import datetime, timezone

from app.ai.schemas.fairness import (
    FairnessAuditRequest,
    FairnessAuditResult,
    DemographicGroup,
    GroupMetrics,
    DisparateImpactResult,
    BiasMitigationStrategy,
)
from app.services.repository import get_store

logger = logging.getLogger(__name__)


class FairnessAuditor:
    """
    Comprehensive fairness auditing for candidate evaluation system.
    Implements 80% rule, demographic parity, and disparate impact analysis.
    """

    @staticmethod
    def _get_candidate_scores(candidate_ids: List[str]) -> Dict[str, float]:
        """Load scores for given candidate IDs."""
        state = get_store().load()
        scores = {}
        
        for cid in candidate_ids:
            session = next((s for s in state.interview_sessions if s.candidate_id == cid), None)
            if session and session.score_update:
                scores[cid] = session.score_update.final_score
            else:
                scores[cid] = 0.0
        
        return scores

    @staticmethod
    def _calculate_group_metrics(
        group_candidates: List[str],
        all_scores: Dict[str, float],
        threshold: float
    ) -> GroupMetrics:
        """Calculate metrics for a demographic group."""
        scores = [all_scores.get(cid, 0) for cid in group_candidates if cid in all_scores]
        
        if not scores:
            return GroupMetrics(
                group=DemographicGroup(group_id="empty", group_attribute="unknown", candidate_count=0),
                mean_score=0, median_score=0, std_score=0, min_score=0, max_score=0,
                selection_rate=0, positive_outcome_rate=0
            )
        
        above_threshold = sum(1 for s in scores if s >= threshold)
        shortlisted = sum(1 for s in scores if s >= threshold + 10)  # Higher bar for shortlist
        
        return GroupMetrics(
            group=DemographicGroup(
                group_id=group_candidates[0] if group_candidates else "unknown",
                group_attribute="attribute",
                candidate_count=len(scores)
            ),
            mean_score=round(statistics.mean(scores), 2),
            median_score=round(statistics.median(scores), 2),
            std_score=round(statistics.stdev(scores) if len(scores) > 1 else 0, 2),
            min_score=min(scores),
            max_score=max(scores),
            selection_rate=round(above_threshold / len(scores), 3),
            positive_outcome_rate=round(shortlisted / len(scores), 3),
        )

    @staticmethod
    def _disparate_impact_analysis(
        group_metrics: List[GroupMetrics]
    ) -> List[DisparateImpactResult]:
        """
        Calculate disparate impact using 80% rule.
        A group is adversely impacted if their selection rate < 80% of highest.
        """
        if len(group_metrics) < 2:
            return []
        
        # Find reference group (highest selection rate)
        reference = max(group_metrics, key=lambda g: g.positive_outcome_rate)
        ref_rate = reference.positive_outcome_rate
        
        results = []
        for group in group_metrics:
            if group.group.group_id == reference.group.group_id:
                continue
            
            comp_rate = group.positive_outcome_rate
            ratio = comp_rate / ref_rate if ref_rate > 0 else 1.0
            
            if ratio >= 0.9:
                severity = "none"
            elif ratio >= 0.8:
                severity = "minor"
            elif ratio >= 0.6:
                severity = "moderate"
            else:
                severity = "severe"
            
            violated = ratio < 0.8
            
            results.append(DisparateImpactResult(
                reference_group=reference.group.group_id,
                comparison_group=group.group.group_id,
                reference_rate=round(ref_rate, 3),
                comparison_rate=round(comp_rate, 3),
                ratio=round(ratio, 3),
                four_fifths_rule_violated=violated,
                severity=severity,
                recommendation="Review scoring criteria" if violated else "No action needed"
            ))
        
        return results

    @staticmethod
    def _calculate_fairness_score(disparate_impact: List[DisparateImpactResult]) -> float:
        """Calculate overall fairness score 0-1 based on disparate impact results."""
        if not disparate_impact:
            return 1.0
        
        # Average ratio across all comparisons
        ratios = [r.ratio for r in disparate_impact]
        avg_ratio = statistics.mean(ratios)
        
        # Penalize severe violations more
        severe_count = sum(1 for r in disparate_impact if r.severity == "severe")
        moderate_count = sum(1 for r in disparate_impact if r.severity == "moderate")
        
        penalty = (severe_count * 0.3 + moderate_count * 0.15) / len(disparate_impact)
        
        return max(0, min(1, avg_ratio - penalty))

    @staticmethod
    def _generate_mitigation_strategies(
        disparate_impact: List[DisparateImpactResult],
        group_metrics: List[GroupMetrics]
    ) -> List[BiasMitigationStrategy]:
        """Generate strategies to mitigate detected biases."""
        strategies = []
        
        for di in disparate_impact:
            if di.four_fifths_rule_violated:
                # Identify which dimensions might be causing disparity
                affected = [di.comparison_group]
                
                strategies.append(BiasMitigationStrategy(
                    bias_type="disparate_impact",
                    affected_groups=affected,
                    current_disparity=round(1 - di.ratio, 3),
                    suggested_adjustment="Review dimension weights for affected group",
                    expected_improvement=round((0.8 - di.ratio) * 100, 1)
                ))
        
        return strategies

    @staticmethod
    async def comprehensive_audit(request: FairnessAuditRequest) -> FairnessAuditResult:
        """
        Perform comprehensive fairness audit across demographic groups.
        """
        logger.info(f"[FairnessAuditor.comprehensive_audit] START | candidates={len(request.candidate_ids)}")

        # Load scores
        all_scores = FairnessAuditor._get_candidate_scores(request.candidate_ids)
        
        # Group candidates by demographic attributes
        grouped_candidates = defaultdict(list)
        for cid, attr_value in request.demographic_attributes.items():
            grouped_candidates[attr_value].append(cid)
        
        # Calculate metrics per group
        group_metrics = []
        for group_id, candidates in grouped_candidates.items():
            metrics = FairnessAuditor._calculate_group_metrics(
                candidates, all_scores, request.score_threshold
            )
            # Update group info
            metrics.group.group_id = group_id
            metrics.group.group_attribute = "demographic"
            group_metrics.append(metrics)
        
        # Disparate impact analysis
        disparate_impact = FairnessAuditor._disparate_impact_analysis(group_metrics)
        
        # Overall fairness
        fairness_score = FairnessAuditor._calculate_fairness_score(disparate_impact)
        
        # Determine rating
        if fairness_score >= 0.9:
            rating = "excellent"
        elif fairness_score >= 0.8:
            rating = "good"
        elif fairness_score >= 0.7:
            rating = "fair"
        elif fairness_score >= 0.6:
            rating = "poor"
        else:
            rating = "biased"
        
        # Critical issues
        critical_issues = [
            f"{di.comparison_group}: {di.severity} disparate impact (ratio={di.ratio:.2f})"
            for di in disparate_impact if di.severity in ["moderate", "severe"]
        ]
        
        # Recommendations
        recommendations = []
        if any(di.four_fifths_rule_violated for di in disparate_impact):
            recommendations.append("Conduct bias audit on individual dimensions")
            recommendations.append("Consider adjusting scoring weights for affected groups")
            recommendations.append("Implement human review for borderline cases in affected groups")
        
        if fairness_score < 0.8:
            recommendations.append("Schedule fairness calibration session with committee")
        
        disparate_summary = (
            f"{sum(1 for di in disparate_impact if di.four_fifths_rule_violated)} groups "
            f"show disparate impact; worst ratio: {min((di.ratio for di in disparate_impact), default=1.0):.2f}"
            if disparate_impact else "No disparate impact detected"
        )
        
        # Mitigation strategies
        strategies = FairnessAuditor._generate_mitigation_strategies(disparate_impact, group_metrics)
        recommendations.extend([f"Strategy: {s.suggested_adjustment}" for s in strategies])

        result = FairnessAuditResult(
            audit_timestamp=datetime.now(timezone.utc),
            total_candidates=len(request.candidate_ids),
            group_metrics=group_metrics,
            disparate_impact_results=disparate_impact,
            disparate_impact_summary=disparate_summary,
            equalized_odds=None,  # Requires historical outcome data
            calibration_by_group=None,  # Requires outcome data
            overall_fairness_score=round(fairness_score, 3),
            fairness_rating=rating,
            critical_issues=critical_issues,
            recommendations=recommendations,
        )

        logger.info(f"[FairnessAuditor.comprehensive_audit] DONE | score={fairness_score:.3f} rating={rating}")
        return result

    @staticmethod
    async def demographic_parity_check(
        candidate_ids: List[str],
        attribute_values: Dict[str, str]
    ) -> Dict[str, dict]:
        """
        Quick check for demographic parity in scores.
        """
        logger.info(f"[FairnessAuditor.demographic_parity_check] START | candidates={len(candidate_ids)}")

        scores = FairnessAuditor._get_candidate_scores(candidate_ids)
        
        # Group by attribute
        groups = defaultdict(list)
        for cid, attr in attribute_values.items():
            if cid in scores:
                groups[attr].append(scores[cid])
        
        results = {}
        for attr, group_scores in groups.items():
            if group_scores:
                results[attr] = {
                    "count": len(group_scores),
                    "mean_score": round(statistics.mean(group_scores), 2),
                    "std": round(statistics.stdev(group_scores) if len(group_scores) > 1 else 0, 2),
                    "median": round(statistics.median(group_scores), 2),
                }
        
        logger.info(f"[FairnessAuditor.demographic_parity_check] DONE | groups={len(results)}")
        return results
