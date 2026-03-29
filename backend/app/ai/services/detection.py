import logging
import math
import re
import statistics
from urllib.parse import urlparse
import httpx
from app.ai.base import llm
from app.ai.config import ai_config
from app.ai.schemas.detection import (
    AIDetectionRequest,
    AIDetectionResult,
    AIDetectionSignals,
    ResourceValidationRequest,
    ResourceValidationResult,
)

logger = logging.getLogger(__name__)


class AIContentDetector:
    """
    Detects AI-generated content using heuristics + LLM verdict.
    """

    @staticmethod
    def _compute_heuristics(text: str) -> dict:
        """
        Compute heuristics to detect AI-generated content.
        """
        sentences = re.split(r'[.!?]+', text)
        lengths = [len(s.split()) for s in sentences if s.strip()]

        # Burstiness: std/mean of sentence lengths. AI = low burstiness.
        mean_len = statistics.mean(lengths) if lengths else 1
        std_len = statistics.stdev(lengths) if len(lengths) > 2 else 0
        burstiness = std_len / mean_len if mean_len else 0

        # Lexical diversity: unique words / total words
        words = text.lower().split()
        lexical_diversity = len(set(words)) / max(len(words), 1)

        # Entropy proxy: character-level
        freq = {}
        for c in text:
            freq[c] = freq.get(c, 0) + 1
        total = len(text)
        entropy = -sum((f/total) * math.log2(f/total) for f in freq.values() if f > 0)
        entropy_score = min(1.0, entropy / 5.0)  # normalize, 5 bits ≈ natural text

        # Over-structured: excessive numbered lists, headers
        over_structured = bool(re.search(r'(\d+\.\s|\-\s|\*\s)', text, re.MULTILINE) and
                               len(re.findall(r'\n', text)) > 5)

        # Template phrases
        ai_phrases = [
            "certainly!", "great question", "absolutely", "of course",
            "i'd be happy to", "as an ai", "it's worth noting",
            "in conclusion", "firstly", "secondly", "thirdly",
            "in summary", "to summarize", "i hope this helps",
        ]
        found = [p for p in ai_phrases if p in text.lower()]

        return {
            "burstiness": round(burstiness, 3),
            "lexical_diversity": round(lexical_diversity, 3),
            "entropy_score": round(entropy_score, 3),
            "over_structured": over_structured,
            "template_phrases_found": found,
            "unnatural_perfection": lexical_diversity > 0.75 and entropy_score > 0.85,
        }

    @staticmethod
    async def detect(request: AIDetectionRequest) -> AIDetectionResult:
        """
        Detect AI-generated content using heuristics + LLM verdict.
        """
        logger.info(f"[AIContentDetector.detect] START | text_id={request.text_id}")

        try:
            # Step 1 — Heuristics (pure Python, no LLM)
            heuristics = AIContentDetector._compute_heuristics(request.text)

            # Step 2 — LLM verdict
            system_prompt = """You are an AI-generated content detector.
Analyze this text and estimate the probability (0.0-1.0) that it was written by an AI.
Signs of AI: perfect structure, no personal anecdotes, generic phrasing, overly formal.
Signs of human: personal stories, imperfect grammar, emotional language, specific details.
Return JSON: {"ai_probability": float, "reasoning": str}"""

            user_prompt = f"Text to analyze:\n{request.text[:2000]}"  # Limit length

            llm_fallback = {"ai_probability": 0.5, "reasoning": "LLM fallback"}

            try:
                llm_result, used_llm_fallback = await llm.complete_with_fallback(
                    system_prompt, user_prompt, llm_fallback, temperature=0.1, max_tokens=500
                )
                llm_prob = llm_result.get("ai_probability", 0.5)
            except Exception as e:
                logger.error(f"[AIContentDetector.detect] LLM call failed: {e}")
                llm_prob = 0.5
                used_llm_fallback = True

            # Step 3 — Combine: final_probability = 0.6 * llm_prob + 0.4 * heuristic_prob
            # heuristic_prob = 1 - burstiness (clamped 0-1)
            heuristic_prob = max(0, min(1, 1 - heuristics["burstiness"]))
            final_probability = 0.6 * llm_prob + 0.4 * heuristic_prob

            # Determine verdict
            if final_probability < 0.3:
                verdict = "likely_human"
            elif final_probability > 0.7:
                verdict = "likely_ai"
            else:
                verdict = "uncertain"

            signals = AIDetectionSignals(
                entropy_score=heuristics["entropy_score"],
                burstiness=heuristics["burstiness"],
                lexical_diversity=heuristics["lexical_diversity"],
                over_structured=heuristics["over_structured"],
                unnatural_perfection=heuristics["unnatural_perfection"],
                template_phrases_found=heuristics["template_phrases_found"],
                llm_verdict_probability=llm_prob,
            )

            result = AIDetectionResult(
                text_id=request.text_id,
                final_probability=round(final_probability, 3),
                verdict=verdict,
                signals=signals,
                used_fallback=used_llm_fallback,
            )

            logger.info(f"[AIContentDetector.detect] DONE | verdict={verdict} probability={final_probability:.3f}")
            return result

        except Exception as e:
            logger.error(f"[AIContentDetector.detect] FAILURE | error={str(e)} | returning fallback")
            return AIDetectionResult(
                text_id=request.text_id,
                final_probability=0.5,
                verdict="uncertain",
                signals=AIDetectionSignals(
                    entropy_score=0.5,
                    burstiness=0.5,
                    lexical_diversity=0.5,
                    over_structured=False,
                    unnatural_perfection=False,
                    template_phrases_found=[],
                    llm_verdict_probability=0.5,
                ),
                used_fallback=True,
            )


class AuthenticityChecker:
    """
    Validates candidate resources (GitHub, portfolio, LinkedIn) for authenticity.
    """

    @staticmethod
    async def validate_resources(request: ResourceValidationRequest) -> ResourceValidationResult:
        """
        Validate candidate resources and compute authenticity score.
        """
        logger.info(f"[AuthenticityChecker.validate_resources] START | candidate_id={request.candidate_id}")

        red_flags = []
        notes = []
        github_valid = None
        github_activity_score = None
        portfolio_reachable = None

        async with httpx.AsyncClient(timeout=10) as client:
            # Check GitHub
            if request.github_url:
                try:
                    parsed = urlparse(request.github_url)
                    if parsed.netloc == "github.com":
                        username = parsed.path.strip("/").split("/")[0]
                        resp = await client.get(f"https://api.github.com/users/{username}")
                        if resp.status_code == 200:
                            data = resp.json()
                            github_valid = True
                            repos = data.get("public_repos", 0)
                            followers = data.get("followers", 0)
                            github_activity_score = min(100, repos * 5 + followers * 2)
                            if repos == 0:
                                red_flags.append("GitHub has 0 public repos")
                            notes.append(f"GitHub: {repos} repos, {followers} followers")
                        else:
                            github_valid = False
                            red_flags.append("GitHub account not found or API error")
                    else:
                        red_flags.append("Invalid GitHub URL format")
                except Exception as e:
                    logger.warning(f"GitHub validation failed: {e}")
                    red_flags.append(f"GitHub validation error: {str(e)}")

            # Check portfolio
            if request.portfolio_url:
                try:
                    resp = await client.head(request.portfolio_url, follow_redirects=True)
                    portfolio_reachable = resp.status_code == 200
                    if not portfolio_reachable:
                        red_flags.append("Portfolio URL unreachable")
                    else:
                        notes.append("Portfolio URL is reachable")
                except Exception as e:
                    logger.warning(f"Portfolio validation failed: {e}")
                    portfolio_reachable = False
                    red_flags.append(f"Portfolio validation error: {str(e)}")

        # Compute overall authenticity score
        scores = []
        if github_activity_score is not None:
            scores.append(github_activity_score)
        if portfolio_reachable is not None:
            scores.append(100 if portfolio_reachable else 0)

        overall_score = statistics.mean(scores) if scores else 50

        result = ResourceValidationResult(
            candidate_id=request.candidate_id,
            github_valid=github_valid,
            github_activity_score=github_activity_score,
            portfolio_reachable=portfolio_reachable,
            overall_authenticity_score=round(overall_score, 2),
            red_flags=red_flags,
            notes="; ".join(notes) if notes else "No resources validated",
        )

        logger.info(f"[AuthenticityChecker.validate_resources] DONE | score={overall_score:.2f} red_flags={len(red_flags)}")
        return result
