import logging
from app.ai.base import llm
from app.ai.config import ai_config
from app.ai.schemas.scoring import (
    DimensionScore,
    MultiDimensionalRequest,
    MultiDimensionalScore,
    BehavioralSignals,
)

logger = logging.getLogger(__name__)


class MultiDimensionalScorer:
    """
    Scores candidates on 5 dimensions using LLM with full rationale and evidence.
    """

    @staticmethod
    async def score(request: MultiDimensionalRequest) -> MultiDimensionalScore:
        """
        Score a candidate on 5 dimensions based on interview transcript.
        """
        logger.info(f"[MultiDimensionalScorer.score] START | candidate_id={request.candidate_id} role={request.role}")

        system_prompt = f"""You are an expert evaluator for {request.role} candidates.
Score the candidate on 5 dimensions based on the interview transcript.
Each score is 0-100. Include confidence (0-1), rationale, and evidence quotes.

DIMENSIONS:
- hard_skills: Technical knowledge, domain expertise
- soft_skills: Empathy, teamwork, leadership mindset
- problem_solving: Reasoning, creativity, structured thinking
- communication: Clarity, vocabulary, expressiveness
- adaptability: Flexibility, learning mindset, resilience

RULES:
- Base scores ONLY on the text provided
- Include exact quotes as evidence
- Confidence below 0.5 means you have insufficient data
- Do NOT assume anything not stated

Return strict JSON matching this schema:
{{
  "hard_skills": {{"score": int, "confidence": float, "rationale": str, "evidence": [str]}},
  "soft_skills": {{...}},
  "problem_solving": {{...}},
  "communication": {{...}},
  "adaptability": {{...}}
}}"""

        user_prompt = f"""Interview transcript:
{request.interview_transcript}

Essay text:
{request.essay_text or "Not provided"}

Context: {request.context or "None"}"""

        # Fallback value
        fallback = {
            "hard_skills": {"score": 50, "confidence": 0.3, "rationale": "Fallback due to AI error", "evidence": []},
            "soft_skills": {"score": 50, "confidence": 0.3, "rationale": "Fallback due to AI error", "evidence": []},
            "problem_solving": {"score": 50, "confidence": 0.3, "rationale": "Fallback due to AI error", "evidence": []},
            "communication": {"score": 50, "confidence": 0.3, "rationale": "Fallback due to AI error", "evidence": []},
            "adaptability": {"score": 50, "confidence": 0.3, "rationale": "Fallback due to AI error", "evidence": []},
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.2, max_tokens=2000
            )

            scores = MultiDimensionalScore(
                hard_skills=DimensionScore(**result["hard_skills"]),
                soft_skills=DimensionScore(**result["soft_skills"]),
                problem_solving=DimensionScore(**result["problem_solving"]),
                communication=DimensionScore(**result["communication"]),
                adaptability=DimensionScore(**result["adaptability"]),
            )

            logger.info(f"[MultiDimensionalScorer.score] DONE | used_fallback={used_fallback}")
            return scores

        except Exception as e:
            logger.error(f"[MultiDimensionalScorer.score] AI FAILURE | error={str(e)} | returning fallback")
            return MultiDimensionalScore(
                hard_skills=DimensionScore(score=50, confidence=0.3, rationale="Error fallback", evidence=[]),
                soft_skills=DimensionScore(score=50, confidence=0.3, rationale="Error fallback", evidence=[]),
                problem_solving=DimensionScore(score=50, confidence=0.3, rationale="Error fallback", evidence=[]),
                communication=DimensionScore(score=50, confidence=0.3, rationale="Error fallback", evidence=[]),
                adaptability=DimensionScore(score=50, confidence=0.3, rationale="Error fallback", evidence=[]),
            )

    @staticmethod
    async def detect_behavioral_signals(transcript: str) -> BehavioralSignals:
        """
        Detect behavioral signals like confidence, hesitation, and evasiveness.
        """
        logger.info(f"[MultiDimensionalScorer.detect_behavioral_signals] START | transcript_length={len(transcript)}")

        system_prompt = """Analyze this interview transcript for behavioral signals.
Detect: confidence, hesitation patterns, evasiveness.

Confidence: direct answers, self-assurance, ownership of experience.
Hesitation: "I think maybe", "I'm not sure", repeated qualifiers.
Evasiveness: question deflection, vague generalities, topic changes.

Return JSON:
{
  "confidence_level": float (0-1),
  "hesitation_detected": bool,
  "evasiveness_score": float (0-1),
  "behavioral_flags": [str]
}"""

        user_prompt = f"Transcript:\n{transcript}"

        fallback = {
            "confidence_level": 0.5,
            "hesitation_detected": False,
            "evasiveness_score": 0.5,
            "behavioral_flags": ["fallback_used"],
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.2, max_tokens=500
            )

            signals = BehavioralSignals(
                confidence_level=result.get("confidence_level", 0.5),
                hesitation_detected=result.get("hesitation_detected", False),
                evasiveness_score=result.get("evasiveness_score", 0.5),
                behavioral_flags=result.get("behavioral_flags", []),
            )

            logger.info(f"[MultiDimensionalScorer.detect_behavioral_signals] DONE | used_fallback={used_fallback}")
            return signals

        except Exception as e:
            logger.error(f"[MultiDimensionalScorer.detect_behavioral_signals] AI FAILURE | error={str(e)} | returning fallback")
            return BehavioralSignals(
                confidence_level=0.5,
                hesitation_detected=False,
                evasiveness_score=0.5,
                behavioral_flags=["ai_error_fallback"],
            )
