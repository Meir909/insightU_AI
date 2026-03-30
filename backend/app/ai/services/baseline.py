import logging
import re
from typing import Optional
from app.ai.schemas.scoring import MultiDimensionalScore, DimensionScore

logger = logging.getLogger(__name__)


class BaselineScorer:
    """
    Simple rule-based scoring for comparison with AI.
    Demonstrates the value of AI over basic keyword counting.
    """

    # Keyword lists for baseline scoring
    KEYWORDS = {
        "hard_skills": [
            "python", "java", "javascript", "code", "programming", "development",
            "database", "sql", "api", "backend", "frontend", "fullstack",
            "architecture", "system", "deploy", "git", "github", "docker",
            "kubernetes", "cloud", "aws", "azure", "testing", "debug"
        ],
        "soft_skills": [
            "team", "collaborate", "communication", "empathy", "listen",
            "help", "support", "mentor", "lead", "leadership", "conflict",
            "resolve", "emotional", "interpersonal", "relationship"
        ],
        "problem_solving": [
            "solve", "solution", "problem", "analyze", "analysis", "approach",
            "strategy", "creative", "innovation", "critical", "thinking",
            "logic", "hypothesis", "test", "iterate", "improve", "optimize"
        ],
        "communication": [
            "explain", "present", "speak", "write", "articulate", "clear",
            "convince", "persuade", "document", "report", "feedback",
            "negotiate", "discussion", "debate", "story", "narrative"
        ],
        "adaptability": [
            "adapt", "change", "learn", "new", "challenge", "uncomfortable",
            "growth", "flexible", "pivot", "transition", "evolve", "resilience",
            "recover", "stress", "pressure", "uncertainty", "unknown"
        ],
        "motivation": [
            "want", "goal", "dream", "ambition", "passion", "motivation",
            "inspire", "change", "impact", "help", "society", "community",
            "future", "vision", "purpose", "mission", "dedicate", "commit"
        ],
    }

    @staticmethod
    def _count_keywords(text: str, keywords: list) -> int:
        """Count keyword occurrences in text (case-insensitive)."""
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)
        return sum(words.count(kw) for kw in keywords)

    @staticmethod
    def score_candidate(
        transcript: str,
        essay: Optional[str] = None
    ) -> dict:
        """
        Generate baseline scores using keyword counting.
        Returns scores 0-100 per dimension.
        """
        logger.info(f"[BaselineScorer.score_candidate] START | transcript_length={len(transcript)}")

        combined_text = transcript
        if essay:
            combined_text += " " + essay

        total_words = max(len(re.findall(r'\b\w+\b', combined_text.lower())), 1)

        scores = {}
        for dimension, keywords in BaselineScorer.KEYWORDS.items():
            keyword_count = BaselineScorer._count_keywords(combined_text, keywords)
            # Scale: 1 keyword per 20 words = 100 score, capped
            density = keyword_count / total_words
            score = min(100, density * 2000)
            scores[dimension] = round(score, 2)

        # Calculate overall score (exclude motivation from average, it's separate)
        core_dims = ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]
        overall_score = sum(scores[d] for d in core_dims) / len(core_dims)

        result = {
            "method": "keyword_baseline",
            "description": "Simple keyword counting without semantic understanding",
            "scores": scores,
            "overall_score": round(overall_score, 2),
            "total_words_analyzed": total_words,
            "keyword_hits": {dim: BaselineScorer._count_keywords(combined_text, kws) 
                           for dim, kws in BaselineScorer.KEYWORDS.items()},
        }

        logger.info(f"[BaselineScorer.score_candidate] DONE | overall={result['overall_score']}")
        return result

    @staticmethod
    def compare_with_ai(
        baseline_result: dict,
        ai_scores: MultiDimensionalScore
    ) -> dict:
        """
        Compare baseline scores with AI scores and explain differences.
        """
        logger.info("[BaselineScorer.compare_with_ai] START")

        ai_dict = {
            "hard_skills": ai_scores.hard_skills.score,
            "soft_skills": ai_scores.soft_skills.score,
            "problem_solving": ai_scores.problem_solving.score,
            "communication": ai_scores.communication.score,
            "adaptability": ai_scores.adaptability.score,
        }

        comparisons = {}
        for dim in ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]:
            baseline = baseline_result["scores"].get(dim, 0)
            ai = ai_dict.get(dim, 0)
            diff = ai - baseline
            
            if abs(diff) < 10:
                interpretation = "similar_assessment"
            elif diff > 0:
                interpretation = "ai_detected_strengths_missed_by_keywords"
            else:
                interpretation = "ai_penalized_lack_of_substance"

            comparisons[dim] = {
                "baseline": baseline,
                "ai_score": ai,
                "difference": round(diff, 2),
                "interpretation": interpretation,
            }

        # Overall comparison
        baseline_overall = baseline_result["overall_score"]
        ai_overall = sum(ai_dict.values()) / len(ai_dict)
        
        result = {
            "baseline_overall": baseline_overall,
            "ai_overall": round(ai_overall, 2),
            "overall_difference": round(ai_overall - baseline_overall, 2),
            "per_dimension": comparisons,
            "value_add": "AI understands context, nuance, and semantic meaning beyond keyword matching",
            "recommendation": "Trust AI scores over baseline; baseline is for validation only",
        }

        logger.info(f"[BaselineScorer.compare_with_ai] DONE | ai_advantage={result['overall_difference']}")
        return result
