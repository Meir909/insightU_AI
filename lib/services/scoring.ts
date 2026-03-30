import { completeWithFallback } from './llm';
import type { MultiDimensionalRequest, MultiDimensionalScore, DimensionScore } from '@/lib/schemas';

export async function score(request: MultiDimensionalRequest): Promise<MultiDimensionalScore> {
  console.log(`[MultiDimensionalScorer.score] START | candidate_id=${request.candidate_id} role=${request.role}`);

  const systemPrompt = `You are an expert evaluator for ${request.role} candidates.
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
  "hard_skills": {"score": number, "confidence": number, "rationale": string, "evidence": [string]},
  "soft_skills": {...},
  "problem_solving": {...},
  "communication": {...},
  "adaptability": {...}
}}`;

  const userPrompt = `Interview transcript:\n${request.interview_transcript}\n\nEssay text:\n${request.essay_text || 'Not provided'}\n\nContext: ${JSON.stringify(request.context) || 'None'}`;

  const fallback = {
    hard_skills: { score: 50, confidence: 0.3, rationale: 'Fallback due to AI error', evidence: [] },
    soft_skills: { score: 50, confidence: 0.3, rationale: 'Fallback due to AI error', evidence: [] },
    problem_solving: { score: 50, confidence: 0.3, rationale: 'Fallback due to AI error', evidence: [] },
    communication: { score: 50, confidence: 0.3, rationale: 'Fallback due to AI error', evidence: [] },
    adaptability: { score: 50, confidence: 0.3, rationale: 'Fallback due to AI error', evidence: [] },
  };

  try {
    const { result } = await completeWithFallback(systemPrompt, userPrompt, fallback, { temperature: 0.2, maxTokens: 2000 });

    const scores: MultiDimensionalScore = {
      hard_skills: result.hard_skills as DimensionScore,
      soft_skills: result.soft_skills as DimensionScore,
      problem_solving: result.problem_solving as DimensionScore,
      communication: result.communication as DimensionScore,
      adaptability: result.adaptability as DimensionScore,
    };

    console.log(`[MultiDimensionalScorer.score] DONE`);
    return scores;
  } catch (error) {
    console.error(`[MultiDimensionalScorer.score] AI FAILURE | error=${error}`);
    return {
      hard_skills: { score: 50, confidence: 0.3, rationale: 'Error fallback', evidence: [] },
      soft_skills: { score: 50, confidence: 0.3, rationale: 'Error fallback', evidence: [] },
      problem_solving: { score: 50, confidence: 0.3, rationale: 'Error fallback', evidence: [] },
      communication: { score: 50, confidence: 0.3, rationale: 'Error fallback', evidence: [] },
      adaptability: { score: 50, confidence: 0.3, rationale: 'Error fallback', evidence: [] },
    };
  }
}

export async function detectBehavioralSignals(transcript: string) {
  console.log(`[MultiDimensionalScorer.detect_behavioral_signals] START | transcript_length=${transcript.length}`);

  const systemPrompt = `Analyze this interview transcript for behavioral signals.
Detect: confidence, hesitation patterns, evasiveness.

Confidence: direct answers, self-assurance, ownership of experience.
Hesitation: "I think maybe", "I'm not sure", repeated qualifiers.
Evasiveness: question deflection, vague generalities, topic changes.

Return JSON:
{
  "confidence_level": float (0-1),
  "hesitation_detected": bool,
  "evasiveness_score": float (0-1),
  "behavioral_flags": [string]
}`;

  const fallback = {
    confidence_level: 0.5,
    hesitation_detected: false,
    evasiveness_score: 0.5,
    behavioral_flags: ['fallback_used'],
  };

  try {
    const { result } = await completeWithFallback(systemPrompt, transcript, fallback, { temperature: 0.2, maxTokens: 500 });
    return {
      confidence_level: result.confidence_level ?? 0.5,
      hesitation_detected: result.hesitation_detected ?? false,
      evasiveness_score: result.evasiveness_score ?? 0.5,
      behavioral_flags: result.behavioral_flags ?? [],
    };
  } catch (error) {
    console.error(`[detectBehavioralSignals] AI FAILURE | error=${error}`);
    return fallback;
  }
}
