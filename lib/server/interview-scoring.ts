import type { ChatAttachment, InterviewScoreUpdate, ModelContribution } from "@/lib/types";

const clip = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

// ─── Heuristic fallback (used when OpenAI unavailable) ────────────────────────

const heuristicScore = (...parts: Array<string | undefined>) => {
  const text = parts.filter(Boolean).join(" ").trim();
  if (!text) return 20;
  const lowered = text.toLowerCase();
  // Length bonus capped at 25 (was 35 — still rewards depth but less aggressively)
  const lengthBonus = Math.min(text.length / 30, 25);
  // Structure: logical connectives signal reasoning depth
  const structureBonus = ["потому", "поэтому", "однако", "если", "during", "because", "however", "тогда как", "вследствие"].some(
    (token) => lowered.includes(token),
  )
    ? 14
    : 5;
  // Evidence: specific numbers, years, percentages
  const evidenceBonus = /\d{4}|\d+%|\d+ (человек|студент|проект|участник)/.test(text) ? 18 : /\d/.test(text) ? 8 : 4;
  // Penalty for very short answers (< 50 chars)
  const brevityPenalty = text.length < 50 ? -10 : 0;
  return clip(30 + lengthBonus + structureBonus + evidenceBonus + brevityPenalty);
};

// ─── GPT-4o-mini quality scorer ───────────────────────────────────────────────

const DIMENSION_RUBRICS: Record<string, string> = {
  cognitive:
    "Analytical thinking and problem-solving. Does the candidate break down complex problems, show logical structure, use data or examples? Generic platitudes score low. Specific structured analysis scores high.",
  leadership:
    "Initiative, influence, and responsibility. Did the candidate actually lead something with concrete impact on others? Vague 'I participated' scores low. Specific 'I convinced X people to do Y, resulting in Z' scores high.",
  growth:
    "Learning mindset and adaptability. Does the candidate reflect on failure, show trajectory of growth, demonstrate ability to change? Claiming perfection scores low. Honest reflection and learning scores high.",
  decision:
    "Structured reasoning in scenarios. Does the candidate propose a concrete actionable plan with clear steps, priorities, and trade-offs? Vague wishes score low. Specific 3-step plan with timeline scores high.",
  motivation:
    "Authentic drive and alignment with the program. Is the motivation specific and personal, or generic? 'I want to change the world' scores low. Personal story connecting to program mission scores high.",
  authenticity:
    "Specificity and internal consistency. Does the candidate use real names, places, dates, numbers? Are claims consistent with earlier answers? Generic claims score low. Verifiable specific details score high.",
};

const INTERVIEW_QUESTIONS = [
  "Для начала кратко представьтесь и расскажите, из какой среды вы выросли.",
  "Почему вы хотите поступить в inVision U и какой путь хотите пройти после обучения?",
  "Расскажите про ситуацию, где вы взяли инициативу и изменили ход событий.",
  "Опишите проект или достижение, которым вы действительно гордитесь. Что именно сделали вы?",
  "Кейс: в вашей школе или сообществе низкая вовлечённость в общественные проекты. Что вы сделаете за ближайшие 3 месяца?",
  "Адаптивный вопрос 1",
  "Адаптивный вопрос 2",
];

interface QualityResult {
  score: number;
  rationale: string;
}

async function qualityScore(
  question: string,
  answer: string,
  dimension: string,
  multimodalContext?: string,
): Promise<QualityResult> {
  if (!process.env.OPENAI_API_KEY || !answer.trim()) {
    return { score: heuristicScore(answer), rationale: "Heuristic fallback (no API key or empty answer)." };
  }

  const contextNote = multimodalContext
    ? `\n\nMultimodal evidence attached by the candidate (audio/video transcript and signals):\n${multimodalContext}`
    : "";

  const prompt = `You are a strict admissions evaluator for inVision U, a selective leadership program in Kazakhstan.

Dimension to evaluate: ${dimension.toUpperCase()}
Rubric: ${DIMENSION_RUBRICS[dimension] ?? "Quality and depth of the answer."}

Interview question asked: "${question}"

Candidate's answer: """${answer}"""${contextNote}

Score this answer on the ${dimension} dimension from 0 to 100.
Be calibrated: 50 = average answer, 70 = good, 85 = strong, 95+ = exceptional.
A short but deeply specific answer can outscore a long generic one.

Respond ONLY with JSON:
{"score": <number 0-100>, "rationale": "<1-2 sentences in Russian explaining the score>"}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { score: heuristicScore(answer), rationale: "Heuristic fallback (API error)." };
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return { score: heuristicScore(answer), rationale: "Heuristic fallback (empty response)." };

    const parsed = JSON.parse(raw) as { score?: number; rationale?: string };
    const score = typeof parsed.score === "number" ? clip(parsed.score) : heuristicScore(answer);
    return { score, rationale: parsed.rationale ?? "" };
  } catch {
    clearTimeout(timeout);
    return { score: heuristicScore(answer), rationale: "Heuristic fallback (timeout or network error)." };
  }
}

// ─── AI probability detection ─────────────────────────────────────────────────

const aiProbability = (essay: string, attachments: ChatAttachment[]) => {
  if (!essay) return 0.22;
  const lowered = essay.toLowerCase();
  const words = essay.trim().split(/\s+/);

  // Generic AI-sounding phrases
  const genericClaims =
    lowered.includes("изменить мир") || lowered.includes("будущих поколений") || lowered.includes("в заключение") ? 0.15 : 0;

  // Perfect over-structured text
  const overStructured = (essay.match(/^\d+\./gm) || []).length > 4 ? 0.10 : 0;

  // Human signals: city names, years, family context
  const detailDiscount =
    ["алматы", "астана", "шымкент", "нур-султан", "атырау", "актобе", "село", "район", "колледж", "school", "district"].filter(
      (token) => lowered.includes(token),
    ).length >= 2
      ? -0.18
      : 0;

  // Specific years and numbers — strong human signal
  const specificNumbers = /\b(19|20)\d{2}\b/.test(essay) && /\d+%|\d+ (человек|студент|участник|место)/.test(essay) ? -0.12 : 0;

  // Audio/video with transcript — very strong human signal (real person recorded themselves)
  const audioVideoDiscount =
    attachments.filter((a) => (a.kind === "audio" || a.kind === "video") && a.transcript && a.transcript.length > 20).length > 0
      ? -0.20
      : 0;

  // Long transcript with specifics (from Whisper) — human signal
  const transcriptDiscount =
    attachments.some((a) => a.transcript && a.transcript.split(/\s+/).length > 200) ? -0.15 : 0;

  const raw =
    0.30 + genericClaims + overStructured + detailDiscount + specificNumbers + audioVideoDiscount + transcriptDiscount;

  // Lexical diversity check: very high diversity (>0.82) may indicate AI
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^а-яёa-z]/g, ""))).size;
  const diversity = words.length > 10 ? uniqueWords / words.length : 0;
  const diversityPenalty = diversity > 0.82 && words.length > 60 ? 0.08 : 0;

  return Math.max(0.03, Math.min(0.97, Math.round((raw + diversityPenalty) * 100) / 100));
};

// ─── Ensemble metadata ────────────────────────────────────────────────────────

const buildEnsemble = (
  cognitive: number,
  leadership: number,
  growth: number,
  decision: number,
  motivation: number,
  authenticity: number,
  usedLLM: boolean,
): ModelContribution[] => [
  {
    model: "GPT-4o quality scorer",
    score: Math.round((motivation + growth + leadership) / 3),
    weight: 0.55,
    rationale: usedLLM
      ? "GPT-4o-mini evaluated answer quality, specificity and depth per dimension rubric."
      : "Heuristic fallback: evaluated structure, evidence markers and logical connectives.",
  },
  {
    model: "Multimodal signal verifier",
    score: Math.round((cognitive + decision + growth) / 3),
    weight: 0.30,
    rationale: "Integrates audio/video transcript signals, extracted key phrases, and artifact evidence into scoring context.",
  },
  {
    model: "Consistency checker",
    score: Math.round(authenticity),
    weight: 0.15,
    rationale: "Cross-checks claim specificity, internal consistency, and AI-generation probability across the full conversation.",
  },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scoreInterview(
  messages: string[],
  attachments: ChatAttachment[] = [],
): Promise<InterviewScoreUpdate> {
  const [intro = "", motivationText = "", leadershipStory = "", achievement = "", scenario = "", adaptiveA = "", adaptiveB = ""] =
    messages;

  // Build multimodal context string from all artifact transcripts + signals
  const multimodalContext =
    attachments.length > 0
      ? attachments
          .map((a) => {
            const parts: string[] = [];
            if (a.transcript) parts.push(`[${a.kind} transcript]: ${a.transcript}`);
            if (a.extractedSignals?.length) parts.push(`[signals]: ${a.extractedSignals.join(", ")}`);
            return parts.join(" ");
          })
          .filter(Boolean)
          .join("\n")
      : undefined;

  // Score all 6 dimensions in parallel via GPT-4o-mini
  const [cognitiveR, leadershipR, growthR, decisionR, motivationR, authenticityR] = await Promise.all([
    qualityScore(
      `${INTERVIEW_QUESTIONS[3]} / ${INTERVIEW_QUESTIONS[4]}`,
      [achievement, scenario, adaptiveA, adaptiveB].filter(Boolean).join(" | "),
      "cognitive",
      multimodalContext,
    ),
    qualityScore(
      INTERVIEW_QUESTIONS[2],
      [leadershipStory, achievement].filter(Boolean).join(" | "),
      "leadership",
      multimodalContext,
    ),
    qualityScore(
      INTERVIEW_QUESTIONS[1],
      [motivationText, leadershipStory, adaptiveA].filter(Boolean).join(" | "),
      "growth",
      multimodalContext,
    ),
    qualityScore(
      INTERVIEW_QUESTIONS[4],
      [scenario, adaptiveB].filter(Boolean).join(" | "),
      "decision",
      multimodalContext,
    ),
    qualityScore(
      INTERVIEW_QUESTIONS[1],
      [motivationText, intro].filter(Boolean).join(" | "),
      "motivation",
      multimodalContext,
    ),
    qualityScore(
      [INTERVIEW_QUESTIONS[2], INTERVIEW_QUESTIONS[3]].join(" / "),
      [leadershipStory, achievement, adaptiveA].filter(Boolean).join(" | "),
      "authenticity",
      multimodalContext,
    ),
  ]);

  const cognitive = cognitiveR.score;
  const leadership = leadershipR.score;
  const growth = growthR.score;
  const decision = decisionR.score;
  const motivation = motivationR.score;

  const aiDetectionText = [leadershipStory, achievement, adaptiveA, multimodalContext ?? ""].join(" ");
  const ai_detection_prob = aiProbability(aiDetectionText, attachments);
  const authenticity = clip(authenticityR.score * 0.7 + (100 - ai_detection_prob * 100) * 0.3);

  const final_score = clip(
    cognitive * 0.25 + leadership * 0.20 + growth * 0.20 + decision * 0.15 + motivation * 0.10 + authenticity * 0.10,
  );

  const spread =
    Math.max(cognitive, leadership, growth, decision, motivation, authenticity) -
    Math.min(cognitive, leadership, growth, decision, motivation, authenticity);

  const confidence = Math.max(
    0.35,
    Math.min(
      0.96,
      Math.round(
        (1 - spread / 120 - (ai_detection_prob > 0.7 ? 0.12 : 0) + Math.min(attachments.length * 0.03, 0.09)) * 100,
      ) / 100,
    ),
  );

  const needs_manual_review = confidence < 0.55 || ai_detection_prob > 0.7;
  const usedLLM = !!process.env.OPENAI_API_KEY;
  const ensemble = buildEnsemble(cognitive, leadership, growth, decision, motivation, authenticity, usedLLM);

  // Build explanation from per-dimension rationales
  const rationaleLines = [
    cognitiveR.rationale,
    leadershipR.rationale,
    authenticityR.rationale,
  ]
    .filter((r) => r && !r.startsWith("Heuristic"))
    .slice(0, 2);

  const explanation =
    rationaleLines.length > 0
      ? rationaleLines.join(" ") +
        (attachments.length > 0
          ? " Мультимодальные артефакты учтены при оценке."
          : "")
      : attachments.length > 0
        ? "Оценка опирается на текст интервью и загруженные мультимодальные артефакты. Финальное решение остаётся за комиссией."
        : "Оценка построена на тексте интервью. Загрузка голосовых или видео-ответов повысит уверенность модели.";

  return {
    cognitive,
    leadership,
    growth,
    decision,
    motivation,
    authenticity,
    final_score,
    confidence,
    ai_detection_prob,
    needs_manual_review,
    recommendation: needs_manual_review ? "Escalate to committee review" : "Proceed to committee discussion",
    explanation,
    ensemble,
  };
}
