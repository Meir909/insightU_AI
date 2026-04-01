/**
 * Motivation Text Analyzer
 *
 * Analyzes candidate motivation texts (whyVisionU, goals, changeAgentVision)
 * using GPT-4o to produce deeper scoring signals than heuristics.
 *
 * Runs fire-and-forget after application submission.
 * Stores result in candidate_evaluations with evaluatorType="motivation_llm".
 */

import { completeWithFallback } from "./llm";
import { createEvaluation } from "@/lib/server/prisma";

export interface MotivationAnalysisResult {
  authenticity: number;        // 0-100: genuine vs generic/AI-written
  depth: number;               // 0-100: specific details vs vague statements
  leadership_signals: number;  // 0-100: evidence of leadership mindset
  growth_orientation: number;  // 0-100: focus on learning & trajectory
  change_agent_score: number;  // 0-100: clarity of impact vision
  ai_probability: number;      // 0-1: likelihood AI generated text
  key_quotes: string[];        // 1-3 strongest quotes
  strengths: string[];
  weaknesses: string[];
  red_flags: string[];
  overall_score: number;       // 0-100: weighted composite
  reasoning: string;
  used_fallback: boolean;
}

const SYSTEM_PROMPT = `Ты — эксперт по оценке потенциала студентов для инновационного университета inVision U (Казахстан, 100% гранты от inDrive).

Твоя задача: проанализировать три мотивационных текста кандидата и оценить их по 5 измерениям.

Возвращай ТОЛЬКО валидный JSON без markdown-обёрток:
{
  "authenticity": <0-100>,
  "depth": <0-100>,
  "leadership_signals": <0-100>,
  "growth_orientation": <0-100>,
  "change_agent_score": <0-100>,
  "ai_probability": <0.0-1.0>,
  "key_quotes": ["цитата1", "цитата2"],
  "strengths": ["сильная сторона 1", "2"],
  "weaknesses": ["слабость 1"],
  "red_flags": [],
  "reasoning": "краткое объяснение оценки на русском"
}

Критерии:
- authenticity: конкретные личные детали (+), клише и обобщения (-)
- depth: измеримые цели и факты (+), размытые фразы (-)
- leadership_signals: примеры руководства командами, инициативы (+)
- growth_orientation: осознание собственного пути роста, готовность учиться (+)
- change_agent_score: чёткое понимание какие именно изменения и где (+)
- ai_probability: монотонный стиль, отсутствие личных деталей, шаблонные фразы (+вероятность AI)

Будь строг: большинство текстов от абитуриентов заслуживают 40-70 баллов, не 90+.`;

function heuristicFallback(texts: { whyVisionU: string; goals: string; changeAgentVision: string }): MotivationAnalysisResult {
  const combined = `${texts.whyVisionU} ${texts.goals} ${texts.changeAgentVision}`;
  const wordCount = combined.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d+/.test(combined);
  const hasSpecifics = /потому что|например|в частности|конкретно|\d{4}/.test(combined.toLowerCase());
  const hasCliches = /изменить мир|светлое будущее|новые горизонты|личностный рост|уникальная возможность/.test(combined.toLowerCase());

  const base = Math.min(60, 30 + wordCount / 15);
  const depth = base + (hasNumbers ? 15 : 0) + (hasSpecifics ? 10 : 0) - (hasCliches ? 10 : 0);
  const authenticity = Math.min(75, depth - (hasCliches ? 15 : 0));

  return {
    authenticity: Math.round(Math.max(20, Math.min(80, authenticity))),
    depth: Math.round(Math.max(20, Math.min(80, depth))),
    leadership_signals: Math.round(Math.max(20, Math.min(70, base + 5))),
    growth_orientation: Math.round(Math.max(25, Math.min(75, base + 10))),
    change_agent_score: Math.round(Math.max(20, Math.min(70, base))),
    ai_probability: hasCliches ? 0.45 : 0.2,
    key_quotes: [],
    strengths: wordCount > 200 ? ["Развёрнутые ответы"] : [],
    weaknesses: hasCliches ? ["Использует клише"] : [],
    red_flags: [],
    overall_score: Math.round(Math.max(30, Math.min(75, (authenticity + depth) / 2))),
    reasoning: "Оценка на основе эвристики (LLM недоступен)",
    used_fallback: true,
  };
}

export async function analyzeMotivationTexts(input: {
  candidateId: string;
  whyVisionU: string;
  goals: string;
  changeAgentVision: string;
}): Promise<MotivationAnalysisResult> {
  const userPrompt = `ТЕКСТ 1 — Почему inVision U:
${input.whyVisionU}

ТЕКСТ 2 — Цели на 5 лет:
${input.goals}

ТЕКСТ 3 — Видение изменений:
${input.changeAgentVision}`;

  const fallback = heuristicFallback(input);

  const { result, usedFallback } = await completeWithFallback(
    SYSTEM_PROMPT,
    userPrompt,
    fallback,
    { model: "gpt-4o", temperature: 0.15, maxTokens: 1000, expectJson: true }
  );

  const analysis = usedFallback ? (result as MotivationAnalysisResult) : (result as MotivationAnalysisResult);

  const overall = usedFallback
    ? fallback.overall_score
    : Math.round(
        (analysis.authenticity * 0.25 +
          analysis.depth * 0.2 +
          analysis.leadership_signals * 0.25 +
          analysis.growth_orientation * 0.15 +
          analysis.change_agent_score * 0.15) *
          (1 - (analysis.ai_probability ?? 0) * 0.2)
      );

  // Persist to candidate_evaluations
  try {
    await createEvaluation({
      candidateId: input.candidateId,
      authenticity: analysis.authenticity,
      leadershipPotential: analysis.leadership_signals,
      adaptability: analysis.growth_orientation,
      changeAgentMindset: analysis.change_agent_score,
      softSkills: analysis.depth,
      overallScore: overall,
      confidence: Math.round((1 - (analysis.ai_probability ?? 0)) * 100) / 100,
      strengths: analysis.strengths ?? [],
      weaknesses: analysis.weaknesses ?? [],
      redFlags: analysis.red_flags ?? [],
      recommendation: overall >= 70 ? "proceed_to_interview" : overall >= 50 ? "review" : "low_priority",
      reasoning: analysis.reasoning ?? "",
      evaluatorType: "motivation_llm",
    });
  } catch (err) {
    console.error("[motivation-analyzer] Failed to save evaluation:", err);
  }

  return { ...analysis, overall_score: overall, used_fallback: usedFallback };
}
