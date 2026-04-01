# BACKEND AI UPGRADE — MASTER PROMPT v2.0
# InsightU AI | Multi-Model Evaluation Engine
# For AI Agent (Claude Code / Cursor / Copilot)

---

## 🧠 AGENT INSTRUCTIONS

You are a **senior backend AI engineer**. You are working on an **existing** FastAPI production system.

Your job is to **extend it** — not rewrite it. Every feature you implement must:
1. Be **fully working code** — no placeholders, no `# TODO`, no `pass`
2. Follow the **exact file structure** defined below
3. Use **Pydantic v2** for all schemas
4. Be **async** end-to-end
5. Include **error handling** with try/except on every AI call
6. Include a **fallback response** if any AI call fails
7. Be tested with a **working example request/response** in comments

You will implement features **in strict order** — each feature depends on the previous one. Do not skip ahead.

---

## 📁 EXISTING SYSTEM (do NOT modify these files)

```
app/
├── main.py                  # FastAPI app with existing routers
├── routers/
│   ├── auth.py
│   ├── candidates.py
│   ├── interviews.py
│   ├── uploads.py
│   ├── committee.py
│   ├── analytics.py
│   └── health.py
├── models/
│   └── (existing DB models)
└── config.py                # Settings (env vars via pydantic-settings)
```

---

## 🏗️ NEW MODULE STRUCTURE (create exactly this)

```
app/
└── ai/
    ├── __init__.py
    ├── router.py              # registers all AI sub-routers into one
    ├── config.py              # AI-specific config (model names, weights, thresholds)
    ├── base.py                # shared LLM client wrapper (OpenAI + fallback)
    │
    ├── schemas/
    │   ├── __init__.py
    │   ├── scoring.py         # all scoring-related Pydantic models
    │   ├── interview.py       # interview analysis models
    │   ├── detection.py       # AI-detection and fraud models
    │   ├── committee.py       # bias check, vote justification models
    │   └── copilot.py         # question generator models
    │
    ├── services/
    │   ├── __init__.py
    │   ├── scoring.py         # MultiDimensionalScorer
    │   ├── ensemble.py        # EnsembleEngine (LLM + rule + keyword)
    │   ├── interview.py       # RealTimeInterviewAnalyzer
    │   ├── detection.py       # AIContentDetector + AuthenticityChecker
    │   ├── copilot.py         # FollowUpGenerator + ThinkingStyleAnalyzer
    │   ├── explain.py         # ExplainabilityEngine
    │   └── committee.py       # BiasDetector + VoteValidator
    │
    └── endpoints/
        ├── __init__.py
        ├── scoring.py
        ├── interview.py
        ├── detection.py
        ├── copilot.py
        ├── explain.py
        └── committee.py
```

---

## ⚙️ STEP 0 — SHARED FOUNDATION (implement first, everything depends on this)

### `app/ai/config.py`

```python
from pydantic_settings import BaseSettings
from typing import Literal

class AIConfig(BaseSettings):
    # LLM
    openai_api_key: str
    openai_primary_model: str = "gpt-4o"
    openai_fallback_model: str = "gpt-4o-mini"  # cheaper fallback
    openai_validation_model: str = "gpt-4o-mini" # for cross-validation pass

    # Thresholds
    ai_detection_threshold: float = 0.72      # above = likely AI-generated
    confidence_min_threshold: float = 0.50    # below = flag for manual review
    cross_validation_divergence: float = 15.0 # score diff > this = inconsistent
    depth_shallow_threshold: float = 0.35
    depth_deep_threshold: float = 0.70
    bias_zscore_threshold: float = 2.0        # z-score for outlier committee votes

    # Scoring weights per role
    role_weights: dict = {
        "default": {
            "hard_skills": 0.25,
            "soft_skills": 0.20,
            "problem_solving": 0.25,
            "communication": 0.15,
            "adaptability": 0.15,
        },
        "backend_engineer": {
            "hard_skills": 0.40,
            "soft_skills": 0.10,
            "problem_solving": 0.30,
            "communication": 0.10,
            "adaptability": 0.10,
        },
        "student_leader": {  # inVision U profile
            "hard_skills": 0.10,
            "soft_skills": 0.25,
            "problem_solving": 0.25,
            "communication": 0.20,
            "adaptability": 0.20,
        },
        "driver": {
            "hard_skills": 0.15,
            "soft_skills": 0.20,
            "problem_solving": 0.20,
            "communication": 0.25,
            "adaptability": 0.20,
        },
        "support": {
            "hard_skills": 0.10,
            "soft_skills": 0.30,
            "problem_solving": 0.20,
            "communication": 0.30,
            "adaptability": 0.10,
        },
    }

    class Config:
        env_file = ".env"
        extra = "ignore"

ai_config = AIConfig()
```

### `app/ai/base.py`

This is the **LLM wrapper** used by ALL services. Implement it completely:

```python
import json
import logging
from openai import AsyncOpenAI
from app.ai.config import ai_config

logger = logging.getLogger(__name__)

class LLMClient:
    """
    Central async LLM client with:
    - Primary model (GPT-4o)
    - Automatic fallback to cheaper model on failure
    - Structured JSON output enforcement
    - Retry logic (2 retries)
    - Full error logging
    """

    def __init__(self):
        self.client = AsyncOpenAI(api_key=ai_config.openai_api_key)

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
        expect_json: bool = True,
    ) -> dict | str:
        """
        Send a completion request. Returns parsed dict if expect_json=True.
        Automatically retries with fallback model on failure.
        """
        target_model = model or ai_config.openai_primary_model
        models_to_try = [target_model, ai_config.openai_fallback_model]

        for attempt, m in enumerate(models_to_try):
            try:
                kwargs = dict(
                    model=m,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if expect_json:
                    kwargs["response_format"] = {"type": "json_object"}

                resp = await self.client.chat.completions.create(**kwargs)
                content = resp.choices[0].message.content

                if expect_json:
                    return json.loads(content)
                return content

            except Exception as e:
                logger.warning(f"LLM attempt {attempt+1} failed with model {m}: {e}")
                if attempt == len(models_to_try) - 1:
                    logger.error(f"All LLM attempts failed: {e}")
                    raise

    async def complete_with_fallback(
        self,
        system_prompt: str,
        user_prompt: str,
        fallback_value: dict,
        **kwargs,
    ) -> tuple[dict, bool]:
        """
        Same as complete() but returns (result, used_fallback: bool).
        Never raises — returns fallback_value on total failure.
        """
        try:
            result = await self.complete(system_prompt, user_prompt, **kwargs)
            return result, False
        except Exception as e:
            logger.error(f"LLM complete_with_fallback: returning fallback. Error: {e}")
            return fallback_value, True


# Singleton instance used across all services
llm = LLMClient()
```

---

## 🔢 STEP 1 — SCHEMAS (implement ALL schemas before any services)

### `app/ai/schemas/scoring.py`

```python
from pydantic import BaseModel, Field, field_validator
from typing import Literal
from enum import Enum

class RoleType(str, Enum):
    DEFAULT = "default"
    BACKEND_ENGINEER = "backend_engineer"
    STUDENT_LEADER = "student_leader"
    DRIVER = "driver"
    SUPPORT = "support"

class DimensionScore(BaseModel):
    score: float = Field(..., ge=0, le=100, description="Score 0-100")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in this score")
    rationale: str = Field(..., description="Why this score was given")
    evidence: list[str] = Field(default_factory=list, description="Quotes from candidate")

class MultiDimensionalScore(BaseModel):
    hard_skills: DimensionScore
    soft_skills: DimensionScore
    problem_solving: DimensionScore
    communication: DimensionScore
    adaptability: DimensionScore

class BehavioralSignals(BaseModel):
    confidence_level: float = Field(..., ge=0, le=1)
    hesitation_detected: bool
    evasiveness_score: float = Field(..., ge=0, le=1)
    behavioral_flags: list[str] = Field(default_factory=list)

class CrossValidationResult(BaseModel):
    pass1_scores: dict[str, float]
    pass2_scores: dict[str, float]
    divergence: dict[str, float]  # abs diff per dimension
    is_consistent: bool
    flagged_dimensions: list[str]

class FinalScore(BaseModel):
    candidate_id: str
    role: RoleType
    weighted_total: float = Field(..., ge=0, le=100)
    dimensional_scores: MultiDimensionalScore
    behavioral_signals: BehavioralSignals
    cross_validation: CrossValidationResult
    overall_confidence: float = Field(..., ge=0, le=1)
    needs_manual_review: bool
    review_reasons: list[str]
    ensemble_breakdown: dict  # llm, rule, keyword contributions

class MultiDimensionalRequest(BaseModel):
    candidate_id: str
    role: RoleType = RoleType.DEFAULT
    interview_transcript: str = Field(..., min_length=50)
    essay_text: str | None = None
    context: dict | None = None

class FinalScoreRequest(BaseModel):
    candidate_id: str
    role: RoleType = RoleType.DEFAULT
    interview_transcript: str
    essay_text: str | None = None
    portfolio_urls: list[str] = Field(default_factory=list)
```

### `app/ai/schemas/interview.py`

```python
from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum

class AnswerDepth(str, Enum):
    SHALLOW = "shallow"
    MEDIUM = "medium"
    DEEP = "deep"

class ThinkingStyle(str, Enum):
    HUMAN_ANALYTICAL = "human_analytical"
    HUMAN_INTUITIVE = "human_intuitive"
    HUMAN_NARRATIVE = "human_narrative"
    AI_PATTERNED = "ai_patterned"
    MIXED = "mixed"

class SingleAnswerAnalysis(BaseModel):
    question: str
    answer: str
    depth: AnswerDepth
    depth_score: float = Field(..., ge=0, le=1)
    thinking_style: ThinkingStyle
    behavioral_signals: dict
    dimensional_deltas: dict[str, float]  # how this answer affects each dimension
    weak_areas: list[str]
    strong_areas: list[str]

class InterviewAnalysisRequest(BaseModel):
    session_id: str
    candidate_id: str
    role: str = "default"
    question: str
    answer: str
    previous_qa: list[dict] = Field(default_factory=list, description="[{question, answer}]")
    current_scores: dict | None = None  # running scores so far

class InterviewAnalysisResponse(BaseModel):
    session_id: str
    analysis: SingleAnswerAnalysis
    updated_scores: dict[str, float]  # cumulative running scores
    session_progress: float = Field(..., ge=0, le=1)  # 0.0-1.0 completeness
```

### `app/ai/schemas/detection.py`

```python
from pydantic import BaseModel, Field

class AIDetectionSignals(BaseModel):
    entropy_score: float = Field(..., ge=0, le=1, description="Low = AI-like")
    burstiness: float = Field(..., ge=0, le=1, description="Low = AI-like")
    lexical_diversity: float = Field(..., ge=0, le=1)
    over_structured: bool
    unnatural_perfection: bool
    template_phrases_found: list[str]
    llm_verdict_probability: float = Field(..., ge=0, le=1)

class AIDetectionResult(BaseModel):
    text_id: str
    final_probability: float = Field(..., ge=0, le=1)
    verdict: str  # "likely_human" | "uncertain" | "likely_ai"
    signals: AIDetectionSignals
    used_fallback: bool = False

class AIDetectionRequest(BaseModel):
    text_id: str
    text: str = Field(..., min_length=50)

class ResourceValidationRequest(BaseModel):
    candidate_id: str
    github_url: str | None = None
    portfolio_url: str | None = None
    linkedin_url: str | None = None
    uploaded_file_ids: list[str] = Field(default_factory=list)

class ResourceValidationResult(BaseModel):
    candidate_id: str
    github_valid: bool | None = None
    github_activity_score: float | None = None
    portfolio_reachable: bool | None = None
    overall_authenticity_score: float
    red_flags: list[str]
    notes: str
```

### `app/ai/schemas/copilot.py`

```python
from pydantic import BaseModel, Field

class FollowUpRequest(BaseModel):
    session_id: str
    role: str = "default"
    previous_qa: list[dict] = Field(..., description="[{question, answer}]")
    weak_areas: list[str] = Field(default_factory=list)
    current_scores: dict | None = None

class FollowUpResponse(BaseModel):
    session_id: str
    suggested_question: str
    target_dimension: str
    reasoning: str
    urgency: str  # "critical" | "recommended" | "optional"

class ThinkingStyleRequest(BaseModel):
    text: str = Field(..., min_length=30)

class ThinkingStyleResult(BaseModel):
    thinking_style: str
    human_markers: list[str]
    ai_markers: list[str]
    confidence: float
```

### `app/ai/schemas/committee.py`

```python
from pydantic import BaseModel, Field

class CommitteeVote(BaseModel):
    member_id: str
    candidate_id: str
    vote: str  # "approve" | "reject" | "hold"
    score: float = Field(..., ge=0, le=100)
    justification: str = Field(..., min_length=30, description="Required explanation")

class BiasCheckRequest(BaseModel):
    candidate_id: str
    votes: list[CommitteeVote]

class BiasCheckResult(BaseModel):
    candidate_id: str
    has_anomaly: bool
    outlier_voters: list[str]
    z_scores: dict[str, float]
    score_variance: float
    recommendation: str
    details: str
```

---

## ⚙️ STEP 2 — SERVICES (implement each service completely, no stubs)

---

### `app/ai/services/scoring.py` — MultiDimensionalScorer

Implement the `MultiDimensionalScorer` class with:

**Method: `async def score(request: MultiDimensionalRequest) -> MultiDimensionalScore`**

System prompt template:
```
You are an expert evaluator for {role} candidates.
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
{
  "hard_skills": {"score": int, "confidence": float, "rationale": str, "evidence": [str]},
  "soft_skills": {...},
  "problem_solving": {...},
  "communication": {...},
  "adaptability": {...}
}
```

**Method: `async def detect_behavioral_signals(transcript: str) -> BehavioralSignals`**

System prompt for behavioral detection:
```
Analyze this interview transcript for behavioral signals.
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
}
```

---

### `app/ai/services/ensemble.py` — EnsembleEngine

This service combines three scoring sources into one final score.

**Three scorers to implement:**

**A) LLM scorer** — calls `MultiDimensionalScorer.score()` → weight: 0.60

**B) Rule-based scorer** — pure Python logic:
```python
def _rule_based_score(transcript: str, role: str) -> dict[str, float]:
    """
    Count signal keywords per dimension.
    Returns raw scores 0-100 for each dimension.
    """
    import re

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
```

**C) Keyword density scorer** — count domain-specific terms, scale to 0-100 → weight: 0.10

**Ensemble formula:**
```
final_dim = 0.60 * llm_score + 0.30 * rule_score + 0.10 * keyword_score
```

**Method: `async def run(request: MultiDimensionalRequest) -> dict`**
Returns: `{"scores": MultiDimensionalScore, "breakdown": {"llm": dict, "rule": dict, "keyword": dict}}`

---

### `app/ai/services/interview.py` — RealTimeInterviewAnalyzer

**Method: `async def analyze_answer(request: InterviewAnalysisRequest) -> InterviewAnalysisResponse`**

This runs on **every single answer** during an active interview session.

System prompt:
```
You are analyzing a single interview answer in real-time.
Role: {role}

Evaluate:
1. DEPTH: shallow (surface answer) / medium (some substance) / deep (insight + evidence + reflection)
2. THINKING STYLE: human_analytical | human_intuitive | human_narrative | ai_patterned | mixed
3. BEHAVIORAL signals: confidence, hesitation, evasiveness (0-1 each)
4. DIMENSIONAL IMPACT: how does this answer change scores for each of 5 dimensions? Return delta (-10 to +10)
5. WEAK AREAS: dimensions this answer failed to demonstrate
6. STRONG AREAS: dimensions this answer demonstrated well

Previous conversation: {previous_qa_formatted}

Return JSON:
{
  "depth": "shallow|medium|deep",
  "depth_score": float,
  "thinking_style": str,
  "behavioral_signals": {"confidence": float, "hesitation": float, "evasiveness": float},
  "dimensional_deltas": {"hard_skills": float, "soft_skills": float, ...},
  "weak_areas": [str],
  "strong_areas": [str]
}
```

After receiving the LLM response, update `current_scores` by applying `dimensional_deltas` (clamped 0-100).

---

### `app/ai/services/detection.py` — AIContentDetector + AuthenticityChecker

#### AIContentDetector

**Method: `async def detect(request: AIDetectionRequest) -> AIDetectionResult`**

Step 1 — Heuristics (pure Python, no LLM):
```python
import math, re, statistics

def _compute_heuristics(text: str) -> dict:
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
```

Step 2 — LLM verdict:
```
System: You are an AI-generated content detector.
Analyze this text and estimate the probability (0.0-1.0) that it was written by an AI.
Signs of AI: perfect structure, no personal anecdotes, generic phrasing, overly formal.
Signs of human: personal stories, imperfect grammar, emotional language, specific details.
Return JSON: {"ai_probability": float, "reasoning": str}
```

Step 3 — Combine:
```python
final_probability = 0.6 * llm_prob + 0.4 * heuristic_prob
# heuristic_prob = 1 - burstiness (clamped 0-1)
```

#### AuthenticityChecker

**Method: `async def validate_resources(request: ResourceValidationRequest) -> ResourceValidationResult`**

- For GitHub: use `httpx` to fetch `https://api.github.com/users/{username}` — check if account exists, has repos, has recent activity (public events)
- For portfolio URL: HEAD request to check if reachable (200 status)
- Compute `overall_authenticity_score` based on what was validated successfully
- List `red_flags` (e.g. "GitHub has 0 public repos", "Portfolio URL unreachable")

Use `httpx.AsyncClient` with timeout=10. Never raise on failure — log and continue.

---

### `app/ai/services/copilot.py` — FollowUpGenerator + ThinkingStyleAnalyzer

#### FollowUpGenerator

**Method: `async def suggest_question(request: FollowUpRequest) -> FollowUpResponse`**

System prompt:
```
You are an AI interview copilot. Based on the interview so far, suggest the SINGLE most valuable next question.

Current weak areas: {weak_areas}
Role: {role}
Current dimensional scores: {scores}

Rules:
- Target the weakest scoring dimension first
- Do not repeat questions already asked
- Match question complexity to role seniority
- If scores are generally high, probe for depth with a challenge question

Return JSON:
{
  "suggested_question": str,
  "target_dimension": str,
  "reasoning": str,
  "urgency": "critical|recommended|optional"
}
```

#### ThinkingStyleAnalyzer

**Method: `async def analyze(request: ThinkingStyleRequest) -> ThinkingStyleResult`**

System prompt:
```
Classify the thinking style in this text.
Options:
- human_analytical: structured logic, data references, cause-effect chains
- human_intuitive: gut feelings, experience-based, less structured
- human_narrative: story-driven, personal examples, emotional
- ai_patterned: template-like, over-structured, no personal voice, generic
- mixed: combination

Return JSON:
{
  "thinking_style": str,
  "human_markers": [str],
  "ai_markers": [str],
  "confidence": float
}
```

---

### `app/ai/services/explain.py` — ExplainabilityEngine

**Method: `async def generate(candidate_id: str, final_score: FinalScore) -> dict`**

System prompt:
```
You are generating an explainability report for a hiring decision.
Be factual. Reference actual evidence. Be concise.

Candidate data: {score_summary}

Generate a structured explanation with:
1. Overall verdict (2 sentences)
2. Top 3 strengths (with evidence from transcript)
3. Top 3 concerns (with evidence)
4. Hiring recommendation: "strong_yes" | "yes" | "hold" | "no"
5. Suggested interview follow-up topics (if hold)

Return JSON:
{
  "verdict_summary": str,
  "strengths": [{"area": str, "evidence": str}],
  "concerns": [{"area": str, "evidence": str}],
  "recommendation": str,
  "follow_up_topics": [str]
}
```

---

### `app/ai/services/committee.py` — BiasDetector + VoteValidator

#### BiasDetector

**Method: `def detect_bias(request: BiasCheckRequest) -> BiasCheckResult`** (sync — pure math)

```python
import statistics

def detect_bias(request: BiasCheckRequest) -> BiasCheckResult:
    scores = [v.score for v in request.votes]
    if len(scores) < 2:
        return BiasCheckResult(
            candidate_id=request.candidate_id,
            has_anomaly=False, outlier_voters=[], z_scores={},
            score_variance=0, recommendation="insufficient_votes",
            details="Need at least 2 votes to check bias"
        )

    mean = statistics.mean(scores)
    std = statistics.stdev(scores) if len(scores) > 1 else 0

    z_scores = {}
    outliers = []
    for vote in request.votes:
        z = abs(vote.score - mean) / std if std > 0 else 0
        z_scores[vote.member_id] = round(z, 2)
        if z > ai_config.bias_zscore_threshold:
            outliers.append(vote.member_id)

    return BiasCheckResult(
        candidate_id=request.candidate_id,
        has_anomaly=len(outliers) > 0,
        outlier_voters=outliers,
        z_scores=z_scores,
        score_variance=round(statistics.variance(scores), 2),
        recommendation="flag_for_review" if outliers else "normal",
        details=f"Mean: {mean:.1f}, Std: {std:.1f}. Outliers detected: {outliers}"
    )
```

#### VoteValidator

**Method: `def validate_justification(vote: CommitteeVote) -> dict`**

Check that `justification` is at least 30 chars and not a generic phrase.
```python
GENERIC_JUSTIFICATIONS = [
    "looks good", "seems fine", "not a good fit",
    "i agree", "good candidate", "bad candidate",
]
def validate_justification(vote: CommitteeVote) -> dict:
    text = vote.justification.lower().strip()
    is_generic = any(text == g for g in GENERIC_JUSTIFICATIONS)
    too_short = len(text) < 30
    return {
        "valid": not is_generic and not too_short,
        "issues": [
            *(["Too short"] if too_short else []),
            *(["Generic justification not accepted"] if is_generic else []),
        ]
    }
```

---

## 🌐 STEP 3 — ENDPOINTS (implement after services are done)

For each endpoint file, implement the FastAPI router. Follow this exact pattern for every endpoint:

```python
from fastapi import APIRouter, HTTPException
import logging

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)
```

### `app/ai/endpoints/scoring.py`

```
POST /ai/score/multidimensional
    Request: MultiDimensionalRequest
    Response: { "scores": MultiDimensionalScore, "used_fallback": bool }
    Logic: calls EnsembleEngine.run()

POST /ai/score/final
    Request: FinalScoreRequest
    Response: FinalScore
    Logic:
        1. EnsembleEngine.run() → dimensional scores
        2. MultiDimensionalScorer.detect_behavioral_signals()
        3. Cross-validation: run LLM scoring TWICE with slightly different temperature (0.2 and 0.5)
           Compare results, flag divergent dimensions
        4. Compute overall_confidence = mean of all dimension confidences
        5. needs_manual_review = True if:
           - overall_confidence < 0.5, OR
           - cross_validation.is_consistent == False, OR
           - behavioral evasiveness > 0.7
        6. Build and return FinalScore
```

### `app/ai/endpoints/interview.py`

```
POST /ai/interview/analyze
    Request: InterviewAnalysisRequest
    Response: InterviewAnalysisResponse
    Logic: calls RealTimeInterviewAnalyzer.analyze_answer()
    Note: This should be FAST (< 3 seconds) — use gpt-4o-mini for this endpoint
```

### `app/ai/endpoints/detection.py`

```
POST /ai/risk/ai-detection
    Request: AIDetectionRequest
    Response: AIDetectionResult
    Logic: AIContentDetector.detect()

POST /ai/resource/validate
    Request: ResourceValidationRequest
    Response: ResourceValidationResult
    Logic: AuthenticityChecker.validate_resources()
```

### `app/ai/endpoints/copilot.py`

```
POST /ai/copilot/question
    Request: FollowUpRequest
    Response: FollowUpResponse
    Logic: FollowUpGenerator.suggest_question()

POST /ai/thinking/analyze
    Request: ThinkingStyleRequest
    Response: ThinkingStyleResult
    Logic: ThinkingStyleAnalyzer.analyze()
```

### `app/ai/endpoints/explain.py`

```
POST /ai/explain
    Request: { "candidate_id": str, "final_score": FinalScore }
    Response: { "explanation": dict, "generated_at": datetime }
    Logic: ExplainabilityEngine.generate()
```

### `app/ai/endpoints/committee.py`

```
POST /ai/committee/bias-check
    Request: BiasCheckRequest
    Response: BiasCheckResult
    Logic: BiasDetector.detect_bias()

POST /ai/committee/vote
    Request: CommitteeVote
    Response: { "accepted": bool, "issues": [str], "stored": bool }
    Logic:
        1. VoteValidator.validate_justification()
        2. If valid → store vote (update existing DB)
        3. If >= 3 votes for this candidate → trigger /ai/committee/bias-check automatically
```

---

## 🔗 STEP 4 — INTEGRATION

### `app/ai/router.py`

```python
from fastapi import APIRouter
from app.ai.endpoints import scoring, interview, detection, copilot, explain, committee

ai_router = APIRouter()
ai_router.include_router(scoring.router)
ai_router.include_router(interview.router)
ai_router.include_router(detection.router)
ai_router.include_router(copilot.router)
ai_router.include_router(explain.router)
ai_router.include_router(committee.router)
```

### Register in `app/main.py` (add this line only, do NOT touch existing code):

```python
from app.ai.router import ai_router
app.include_router(ai_router)
```

---

## 📝 STEP 5 — LOGGING

Add to **every service method** at start and end:

```python
logger.info(f"[ServiceName.method] START | candidate_id={...} role={...}")
# ... logic ...
logger.info(f"[ServiceName.method] DONE | score={...} confidence={...} used_fallback={...}")
```

Add to **every AI call failure**:
```python
logger.error(f"[ServiceName.method] AI FAILURE | error={str(e)} | returning fallback")
```

---

## 🧪 STEP 6 — EXAMPLE REQUEST/RESPONSE COMMENTS

At the **bottom of every endpoint file**, add a comment block:

```python
# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/score/multidimensional
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "interview_transcript": "I led a team of 5 students to build...",
#   "essay_text": "My goal is to change education in Kazakhstan..."
# }
# Response:
# {
#   "scores": {
#     "hard_skills": {"score": 45, "confidence": 0.6, "rationale": "...", "evidence": ["..."]},
#     "soft_skills": {"score": 82, "confidence": 0.9, "rationale": "...", "evidence": ["..."]},
#     ...
#   },
#   "used_fallback": false
# }
```

---

## ✅ IMPLEMENTATION CHECKLIST

Implement in **exactly this order**. Check each off before moving to the next:

- [ ] `app/ai/config.py` — AIConfig with role weights
- [ ] `app/ai/base.py` — LLMClient with fallback logic
- [ ] `app/ai/schemas/scoring.py` — all scoring schemas
- [ ] `app/ai/schemas/interview.py` — interview schemas
- [ ] `app/ai/schemas/detection.py` — detection schemas
- [ ] `app/ai/schemas/copilot.py` — copilot schemas
- [ ] `app/ai/schemas/committee.py` — committee schemas
- [ ] `app/ai/services/scoring.py` — MultiDimensionalScorer (LLM + behavioral)
- [ ] `app/ai/services/ensemble.py` — EnsembleEngine (LLM 60% + rule 30% + keyword 10%)
- [ ] `app/ai/services/interview.py` — RealTimeInterviewAnalyzer
- [ ] `app/ai/services/detection.py` — AIContentDetector + AuthenticityChecker
- [ ] `app/ai/services/copilot.py` — FollowUpGenerator + ThinkingStyleAnalyzer
- [ ] `app/ai/services/explain.py` — ExplainabilityEngine
- [ ] `app/ai/services/committee.py` — BiasDetector + VoteValidator
- [ ] `app/ai/endpoints/scoring.py` — /score/multidimensional + /score/final
- [ ] `app/ai/endpoints/interview.py` — /interview/analyze
- [ ] `app/ai/endpoints/detection.py` — /risk/ai-detection + /resource/validate
- [ ] `app/ai/endpoints/copilot.py` — /copilot/question + /thinking/analyze
- [ ] `app/ai/endpoints/explain.py` — /explain
- [ ] `app/ai/endpoints/committee.py` — /committee/bias-check + /committee/vote
- [ ] `app/ai/router.py` — aggregate all routers
- [ ] Register `ai_router` in `app/main.py`

---

## 🚫 ABSOLUTE RULES

1. **No `pass`, no `# TODO`, no stubs** — every method must be fully implemented
2. **No bare `except Exception`** without logging the error
3. **Every AI call** must have a fallback value defined before the try block
4. **Every endpoint** must return HTTP 422 for validation errors (Pydantic handles this automatically)
5. **Every endpoint** must return HTTP 503 with `{"detail": "AI service unavailable, please retry"}` if all LLM retries fail
6. **Do not modify** any existing router files — only add the new `ai_router`
7. **All imports** must be explicit — no wildcard imports
8. **All float scores** clamped to their valid range after computation (`max(0, min(100, val))`)

---

## 🔁 CROSS-VALIDATION IMPLEMENTATION (critical detail)

For `/ai/score/final` — cross-validation works like this:

```python
# Pass 1: temperature=0.2 (deterministic)
pass1 = await llm.complete(system_prompt, user_prompt, temperature=0.2)

# Pass 2: temperature=0.5 (more varied)  
pass2 = await llm.complete(system_prompt, user_prompt,
                            model=ai_config.openai_validation_model,
                            temperature=0.5)

# Compare
flagged = []
for dim in DIMENSIONS:
    diff = abs(pass1[dim]["score"] - pass2[dim]["score"])
    if diff > ai_config.cross_validation_divergence:
        flagged.append(dim)

is_consistent = len(flagged) == 0
```

---

*InsightU AI Backend v2.0 | Multi-Model Evaluation Engine | Decentrathon 5.0*
