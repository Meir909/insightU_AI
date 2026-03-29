import logging
import re
from app.ai.config import ai_config
from app.ai.schemas.scoring import MultiDimensionalRequest, MultiDimensionalScore, DimensionScore
from app.ai.services.scoring import MultiDimensionalScorer

logger = logging.getLogger(__name__)


class EnsembleEngine:
    """
    Combines three scoring sources into one final ensemble score:
    - LLM scorer (60% weight)
    - Rule-based scorer (30% weight)
    - Keyword density scorer (10% weight)
    """

    @staticmethod
    def _rule_based_score(transcript: str, role: str) -> dict[str, float]:
        """
        Count signal keywords per dimension.
        Returns raw scores 0-100 for each dimension.
        """
        signals = {
            "hard_skills": ["built", "implemented", "coded", "designed", "deployed",
                            "architecture", "algorithm", "database", "api", "system"],
            "soft_skills": ["team", "helped", "mentored", "collaborated", "led",
                            "empathy", "listened", "supported", "conflict", "together"],
            "problem_solving": ["solved", "analyzed", "identified", "approached",
                                "strategy", "hypothesis", "tested", "iterated", "root cause"],
            "communication": ["explained", "presented", "convinced", "documented",
                              "simplified", "feedback", "clarity", "articulated"],
            "adaptability": ["learned", "changed", "adapted", "pivoted", "new",
                             "challenge", "uncomfortable", "growth", "feedback"],
        }
        words = re.findall(r'\b\w+\b', transcript.lower())
        total = max(len(words), 1)
        scores = {}
        for dim, keywords in signals.items():
            hits = sum(words.count(k) for k in keywords)
            density = hits / total
            scores[dim] = min(100, density * 2000)  # scale to 0-100
        return scores

    @staticmethod
    def _keyword_score(transcript: str, role: str) -> dict[str, float]:
        """
        Count domain-specific terms and scale to 0-100.
        """
        domain_keywords = {
            "default": ["project", "experience", "work", "team", "leadership", "communication"],
            "backend_engineer": ["python", "java", "javascript", "sql", "nosql", "docker", "kubernetes",
                                 "microservices", "rest", "graphql", "aws", "azure", "gcp"],
            "student_leader": ["student", "organization", "event", "campus", "community", "initiative",
                               "volunteer", "social", "impact"],
            "driver": ["safety", "route", "delivery", "customer", "navigation", "vehicle",
                       "logistics", "transport"],
            "support": ["customer", "ticket", "issue", "resolution", "satisfaction", "help",
                        "assist", "troubleshoot", "escalate"],
        }

        keywords = domain_keywords.get(role, domain_keywords["default"])
        words = re.findall(r'\b\w+\b', transcript.lower())
        total = max(len(words), 1)
        scores = {}

        # Use same keywords for all dimensions but weighted differently based on role weights
        hits = sum(words.count(k) for k in keywords)
        density = hits / total

        for dim in ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]:
            # Adjust score based on dimension importance for role
            weight = ai_config.role_weights.get(role, ai_config.role_weights["default"]).get(dim, 0.2)
            scores[dim] = min(100, density * 1000 * (1 + weight))

        return scores

    @staticmethod
    async def run(request: MultiDimensionalRequest) -> dict:
        """
        Run ensemble scoring and return combined scores with breakdown.
        """
        logger.info(f"[EnsembleEngine.run] START | candidate_id={request.candidate_id} role={request.role}")

        try:
            # A) LLM scorer (60% weight)
            llm_scores = await MultiDimensionalScorer.score(request)
            llm_dict = {
                "hard_skills": llm_scores.hard_skills.score,
                "soft_skills": llm_scores.soft_skills.score,
                "problem_solving": llm_scores.problem_solving.score,
                "communication": llm_scores.communication.score,
                "adaptability": llm_scores.adaptability.score,
            }

            # B) Rule-based scorer (30% weight)
            rule_scores = EnsembleEngine._rule_based_score(request.interview_transcript, request.role)

            # C) Keyword density scorer (10% weight)
            keyword_scores = EnsembleEngine._keyword_score(request.interview_transcript, request.role)

            # Ensemble formula: final_dim = 0.60 * llm_score + 0.30 * rule_score + 0.10 * keyword_score
            final_scores = {}
            for dim in ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]:
                final_scores[dim] = round(
                    0.60 * llm_dict[dim] + 0.30 * rule_scores[dim] + 0.10 * keyword_scores[dim], 2
                )

            # Build MultiDimensionalScore with ensemble results
            result = MultiDimensionalScore(
                hard_skills=DimensionScore(
                    score=final_scores["hard_skills"],
                    confidence=llm_scores.hard_skills.confidence,
                    rationale=f"Ensemble: LLM({llm_dict['hard_skills']:.1f}) + Rule({rule_scores['hard_skills']:.1f}) + Keyword({keyword_scores['hard_skills']:.1f})",
                    evidence=llm_scores.hard_skills.evidence,
                ),
                soft_skills=DimensionScore(
                    score=final_scores["soft_skills"],
                    confidence=llm_scores.soft_skills.confidence,
                    rationale=f"Ensemble: LLM({llm_dict['soft_skills']:.1f}) + Rule({rule_scores['soft_skills']:.1f}) + Keyword({keyword_scores['soft_skills']:.1f})",
                    evidence=llm_scores.soft_skills.evidence,
                ),
                problem_solving=DimensionScore(
                    score=final_scores["problem_solving"],
                    confidence=llm_scores.problem_solving.confidence,
                    rationale=f"Ensemble: LLM({llm_dict['problem_solving']:.1f}) + Rule({rule_scores['problem_solving']:.1f}) + Keyword({keyword_scores['problem_solving']:.1f})",
                    evidence=llm_scores.problem_solving.evidence,
                ),
                communication=DimensionScore(
                    score=final_scores["communication"],
                    confidence=llm_scores.communication.confidence,
                    rationale=f"Ensemble: LLM({llm_dict['communication']:.1f}) + Rule({rule_scores['communication']:.1f}) + Keyword({keyword_scores['communication']:.1f})",
                    evidence=llm_scores.communication.evidence,
                ),
                adaptability=DimensionScore(
                    score=final_scores["adaptability"],
                    confidence=llm_scores.adaptability.confidence,
                    rationale=f"Ensemble: LLM({llm_dict['adaptability']:.1f}) + Rule({rule_scores['adaptability']:.1f}) + Keyword({keyword_scores['adaptability']:.1f})",
                    evidence=llm_scores.adaptability.evidence,
                ),
            )

            breakdown = {
                "llm": llm_dict,
                "rule": rule_scores,
                "keyword": keyword_scores,
            }

            logger.info(f"[EnsembleEngine.run] DONE | scores={final_scores}")
            return {"scores": result, "breakdown": breakdown}

        except Exception as e:
            logger.error(f"[EnsembleEngine.run] FAILURE | error={str(e)} | returning fallback")
            # Return fallback with default scores
            fallback_score = DimensionScore(score=50, confidence=0.3, rationale="Ensemble fallback due to error", evidence=[])
            return {
                "scores": MultiDimensionalScore(
                    hard_skills=fallback_score,
                    soft_skills=fallback_score,
                    problem_solving=fallback_score,
                    communication=fallback_score,
                    adaptability=fallback_score,
                ),
                "breakdown": {"llm": {}, "rule": {}, "keyword": {}, "error": str(e)},
            }
