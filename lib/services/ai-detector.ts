/**
 * AI Content Detector
 *
 * Combines heuristic signals + LLM verdict to estimate the probability
 * that a candidate's interview answers were written by AI (ChatGPT, etc.).
 *
 * Used at interview completion. Does NOT block the response — runs async.
 */

import { completeWithFallback } from "./llm";

export interface AIDetectionResult {
  probability: number; // 0–1, final combined score
  verdict: "likely_human" | "uncertain" | "likely_ai";
  heuristic_prob: number;
  llm_prob: number;
  signals: string[]; // human-readable flags shown in committee view
  used_fallback: boolean;
}

// ── Heuristics (pure math, no LLM) ─────────────────────────────────────────

function computeHeuristics(text: string): { prob: number; signals: string[] } {
  const signals: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 4);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) return { prob: 0.3, signals: ["Текст слишком короткий для анализа"] };

  // Sentence length variance — AI tends to uniform sentences
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / Math.max(lengths.length, 1);
  const burstiness = Math.sqrt(variance) / Math.max(mean, 1);
  let prob = 0.3;

  if (burstiness < 0.3) {
    prob += 0.18;
    signals.push("Монотонная длина предложений (признак AI)");
  }

  // Lexical diversity
  const uniqueRatio = new Set(words).size / words.length;
  if (uniqueRatio > 0.78) {
    prob += 0.12;
    signals.push("Слишком высокое лексическое разнообразие");
  }

  // AI template phrases
  const aiPhrases = [
    "конечно", "разумеется", "безусловно", "в заключение", "во-первых", "во-вторых", "в-третьих",
    "certainly", "absolutely", "of course", "in conclusion", "firstly", "secondly", "thirdly",
    "it is worth noting", "great question", "i'd be happy to",
  ];
  const foundPhrases = aiPhrases.filter((p) => text.toLowerCase().includes(p));
  if (foundPhrases.length >= 2) {
    prob += 0.14;
    signals.push(`Шаблонные фразы: ${foundPhrases.slice(0, 3).join(", ")}`);
  }

  // Generic leadership claims without specifics
  const genericPatterns = ["изменить мир", "будущих поколений", "стремлюсь к успеху", "хочу внести вклад"];
  const foundGeneric = genericPatterns.filter((p) => text.toLowerCase().includes(p));
  if (foundGeneric.length > 0) {
    prob += 0.1;
    signals.push("Обобщённые формулировки без конкретики");
  }

  // Personal detail bonus (reduces AI prob)
  const personalSignals = [
    /алматы|астана|шымкент|атырау|актобе/i,
    /\d{4}\s*год/,
    /мой\s+(класс|учитель|школа|отец|мать|брат|сестра)/i,
    /я\s+(поступил|победил|запустил|создал|основал)/i,
  ];
  const personalFound = personalSignals.filter((r) => r.test(text)).length;
  if (personalFound >= 2) {
    prob -= 0.18;
    signals.push("Конкретные личные детали (признак живого автора)");
  }

  // Over-structured: excessive numbering or bullet lists
  const bulletCount = (text.match(/^\s*[\d\-•]\s+/gm) || []).length;
  if (bulletCount > 4) {
    prob += 0.1;
    signals.push("Чрезмерно структурированный ответ (списки)");
  }

  return {
    prob: Math.max(0.05, Math.min(0.95, Math.round(prob * 100) / 100)),
    signals,
  };
}

// ── LLM verdict ─────────────────────────────────────────────────────────────

async function getLLMVerdict(text: string): Promise<{ prob: number; used_fallback: boolean }> {
  const system = `You are an AI-generated content detector specialized in university admissions essays and interview answers.

Analyze the text and estimate the probability (0.0–1.0) that it was written by an AI (ChatGPT, etc.).

Signs of AI authorship:
- Perfect structure with no personal voice
- Generic phrases without specific details, dates, names, or places
- No emotional inconsistencies or self-doubt
- Over-formal or template-like transitions
- Lacks specific geographic or personal references

Signs of human authorship:
- Specific personal stories with names, places, and dates
- Imperfect grammar or informal language
- Emotional language and self-reflection
- Specific local references (Kazakh cities, schools, competitions)
- Contradictions or corrections within the text

Return JSON only: {"ai_probability": number, "key_reason": string}`;

  const user = `Interview/essay text to analyze:\n\n${text.slice(0, 3000)}`;

  const fallback = { ai_probability: 0.4, key_reason: "LLM unavailable, using heuristic estimate" };
  const { result, usedFallback } = await completeWithFallback(system, user, fallback, {
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxTokens: 150,
  });

  const prob = typeof result.ai_probability === "number"
    ? Math.max(0, Math.min(1, result.ai_probability))
    : 0.4;

  return { prob, used_fallback: usedFallback };
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function detectAIContent(userMessages: string[]): Promise<AIDetectionResult> {
  const fullText = userMessages.join("\n\n").trim();
  if (!fullText || fullText.length < 80) {
    return {
      probability: 0.2,
      verdict: "likely_human",
      heuristic_prob: 0.2,
      llm_prob: 0.2,
      signals: ["Недостаточно текста для анализа"],
      used_fallback: false,
    };
  }

  const heuristics = computeHeuristics(fullText);
  const llmResult = await getLLMVerdict(fullText);

  // Ensemble: 40% heuristic + 60% LLM
  const combined = Math.round((0.4 * heuristics.prob + 0.6 * llmResult.prob) * 100) / 100;

  const verdict: AIDetectionResult["verdict"] =
    combined >= 0.72 ? "likely_ai" : combined >= 0.45 ? "uncertain" : "likely_human";

  return {
    probability: combined,
    verdict,
    heuristic_prob: heuristics.prob,
    llm_prob: llmResult.prob,
    signals: heuristics.signals,
    used_fallback: llmResult.used_fallback,
  };
}
