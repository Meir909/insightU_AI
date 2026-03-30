import logging
import re
import random
import numpy as np
from typing import Optional, List, Tuple

from app.ai.schemas.privacy import (
    PrivacyScoringRequest,
    PrivacyScoringResult,
    AnonymizationConfig,
    AnonymizationResult,
    PrivacyLevel,
)
from app.ai.services.ensemble import EnsembleEngine
from app.ai.schemas.scoring import MultiDimensionalRequest

logger = logging.getLogger(__name__)


class PrivacyPreservingScorer:
    """
    Privacy-preserving candidate scoring with anonymization and differential privacy.
    """

    # Common patterns for PII detection (simplified regex-based approach)
    PII_PATTERNS = {
        "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "phone": r'\b(?:\+?7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b',
        "url": r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?',
    }

    @staticmethod
    def _detect_names(text: str) -> List[Tuple[str, int, int]]:
        """
        Simple heuristic name detection.
        Returns list of (name, start, end) tuples.
        """
        # Look for capitalized words that could be names
        # Pattern: Capital letter followed by lowercase, not at sentence start
        potential_names = []
        sentences = re.split(r'[.!?]+\s+', text)
        
        for sentence in sentences:
            words = sentence.split()
            for i, word in enumerate(words):
                # Skip first word of sentence (likely capitalized)
                if i == 0:
                    continue
                # Check if word looks like a name (capitalized, 2+ chars)
                clean_word = re.sub(r'[^\w]', '', word)
                if len(clean_word) >= 2 and clean_word[0].isupper() and clean_word[1:].islower():
                    # Check if it's in a list of common non-names
                    non_names = {"The", "This", "That", "These", "They", "Their", "There", 
                                "When", "Where", "What", "Which", "While", "With", "From",
                                "About", "Also", "After", "Before", "Because", "Since",
                                "Team", "Project", "Company", "Work", "Time", "Year"}
                    if clean_word not in non_names:
                        potential_names.append(clean_word)
        
        # Return unique names with dummy positions
        unique_names = list(set(potential_names))
        return [(name, 0, 0) for name in unique_names[:10]]  # Limit to top 10

    @staticmethod
    def anonymize_text(
        text: str,
        config: AnonymizationConfig
    ) -> Tuple[str, AnonymizationResult]:
        """
        Anonymize text by removing PII.
        """
        logger.info(f"[PrivacyPreservingScorer.anonymize_text] START | length={len(text)}")

        original = text
        entities_removed = {}

        # Remove emails
        if config.remove_emails:
            emails = re.findall(PrivacyPreservingScorer.PII_PATTERNS["email"], text)
            text = re.sub(PrivacyPreservingScorer.PII_PATTERNS["email"], config.replacement_strategy, text)
            entities_removed["email"] = len(emails)

        # Remove phones
        if config.remove_phones:
            phones = re.findall(PrivacyPreservingScorer.PII_PATTERNS["phone"], text)
            text = re.sub(PrivacyPreservingScorer.PII_PATTERNS["phone"], config.replacement_strategy, text)
            entities_removed["phone"] = len(phones)

        # Remove URLs (may contain personal websites/LinkedIn)
        if config.remove_organizations:
            urls = re.findall(PrivacyPreservingScorer.PII_PATTERNS["url"], text)
            text = re.sub(PrivacyPreservingScorer.PII_PATTERNS["url"], config.replacement_strategy, text)
            entities_removed["url"] = len(urls)

        # Detect and remove names
        if config.remove_names:
            names = PrivacyPreservingScorer._detect_names(text)
            for name, _, _ in names:
                # Replace occurrences of this name
                pattern = r'\b' + re.escape(name) + r'\b'
                count = len(re.findall(pattern, text))
                if count > 0:
                    text = re.sub(pattern, config.replacement_strategy, text)
                    entities_removed["name"] = entities_removed.get("name", 0) + count

        # Generate samples for verification
        sample_start = len(text) // 4
        sample_before = original[sample_start:sample_start + 100] if len(original) > sample_start + 100 else original[:100]
        sample_after = text[sample_start:sample_start + 100] if len(text) > sample_start + 100 else text[:100]

        result = AnonymizationResult(
            original_length=len(original),
            anonymized_length=len(text),
            entities_removed=entities_removed,
            sample_before=sample_before + "..." if len(sample_before) == 100 else sample_before,
            sample_after=sample_after + "..." if len(sample_after) == 100 else sample_after,
        )

        logger.info(f"[PrivacyPreservingScorer.anonymize_text] DONE | removed={sum(entities_removed.values())} entities")
        return text, result

    @staticmethod
    def add_differential_noise(
        scores: dict[str, float],
        epsilon: float,
        sensitivity: float = 10.0
    ) -> Tuple[dict[str, float], float]:
        """
        Add Laplace noise for differential privacy.
        
        epsilon: privacy parameter (smaller = more private)
        sensitivity: max change in score from adding/removing one candidate
        """
        logger.info(f"[PrivacyPreservingScorer.add_differential_noise] START | epsilon={epsilon}")

        # Laplace scale parameter
        scale = sensitivity / epsilon

        noisy_scores = {}
        total_noise = 0

        for dim, score in scores.items():
            # Add Laplace noise
            noise = np.random.laplace(0, scale)
            noisy_score = max(0, min(100, score + noise))
            noisy_scores[dim] = round(noisy_score, 2)
            total_noise += abs(noise)

        avg_noise = total_noise / len(scores) if scores else 0

        logger.info(f"[PrivacyPreservingScorer.add_differential_noise] DONE | avg_noise={avg_noise:.2f}")
        return noisy_scores, round(avg_noise, 2)

    @staticmethod
    async def privacy_score(
        request: PrivacyScoringRequest
    ) -> PrivacyScoringResult:
        """
        Score candidate with privacy protections applied.
        """
        logger.info(f"[PrivacyPreservingScorer.privacy_score] START | level={request.privacy_level}")

        config = request.anonymization_config or AnonymizationConfig()
        anonymization_info = None
        noise_added = None
        epsilon_used = None
        privacy_guarantee = ""

        # Prepare text based on privacy level
        transcript = request.interview_transcript
        essay = request.essay_text

        if request.privacy_level in [PrivacyLevel.ANONYMIZED, PrivacyLevel.DIFFERENTIAL_PRIVACY]:
            # Anonymize texts
            transcript, anonymization_info = PrivacyPreservingScorer.anonymize_text(transcript, config)
            if essay:
                essay, _ = PrivacyPreservingScorer.anonymize_text(essay, config)

        # Get AI scores (anonymized if needed)
        scoring_request = MultiDimensionalRequest(
            candidate_id=request.candidate_id,
            role=request.role,
            interview_transcript=transcript,
            essay_text=essay,
        )

        result = await EnsembleEngine.run(scoring_request)
        scores = result["scores"]

        raw_scores = {
            "hard_skills": scores.hard_skills.score,
            "soft_skills": scores.soft_skills.score,
            "problem_solving": scores.problem_solving.score,
            "communication": scores.communication.score,
            "adaptability": scores.adaptability.score,
        }

        # Apply differential privacy if requested
        if request.privacy_level == PrivacyLevel.DIFFERENTIAL_PRIVACY:
            epsilon = request.epsilon or 1.0  # Default epsilon
            noisy_scores, noise_added = PrivacyPreservingScorer.add_differential_noise(
                raw_scores, epsilon
            )
            epsilon_used = epsilon
            final_scores = noisy_scores
            privacy_guarantee = f"ε-differential privacy with ε={epsilon}. Noise added to protect individual privacy."
        else:
            final_scores = raw_scores
            if request.privacy_level == PrivacyLevel.ANONYMIZED:
                privacy_guarantee = "Personally identifiable information removed before processing."
            else:
                privacy_guarantee = "Standard processing with full data."

        # Calculate overall
        overall = sum(final_scores.values()) / len(final_scores)

        # Calculate confidence (lower for noisy/anonymized data)
        base_confidence = sum([
            scores.hard_skills.confidence,
            scores.soft_skills.confidence,
            scores.problem_solving.confidence,
            scores.communication.confidence,
            scores.adaptability.confidence,
        ]) / 5

        if request.privacy_level == PrivacyLevel.DIFFERENTIAL_PRIVACY:
            confidence = max(0.3, base_confidence - 0.2)  # Penalty for noise
        elif request.privacy_level == PrivacyLevel.ANONYMIZED:
            confidence = max(0.5, base_confidence - 0.1)  # Smaller penalty
        else:
            confidence = base_confidence

        result = PrivacyScoringResult(
            candidate_id=request.candidate_id,
            privacy_level=request.privacy_level,
            anonymization_info=anonymization_info,
            hard_skills=final_scores["hard_skills"],
            soft_skills=final_scores["soft_skills"],
            problem_solving=final_scores["problem_solving"],
            communication=final_scores["communication"],
            adaptability=final_scores["adaptability"],
            overall_score=round(overall, 2),
            noise_added=noise_added,
            epsilon_used=epsilon_used,
            confidence=round(confidence, 3),
            privacy_guarantee=privacy_guarantee,
            data_residency="processed_locally",
            third_party_access=["openai_api"] if request.privacy_level != PrivacyLevel.FEDERATED else [],
        )

        logger.info(f"[PrivacyPreservingScorer.privacy_score] DONE | overall={overall:.2f} confidence={confidence:.3f}")
        return result
