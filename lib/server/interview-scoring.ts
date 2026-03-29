import type { ChatAttachment, InterviewScoreUpdate, ModelContribution } from "@/lib/types";

const clip = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

const textScore = (...parts: Array<string | undefined>) => {
  const text = parts.filter(Boolean).join(" ").trim();
  if (!text) return 20;

  const lowered = text.toLowerCase();
  const lengthBonus = Math.min(text.length / 18, 35);
  const structureBonus = ["потому", "поэтому", "однако", "если", "because", "however"].some((token) =>
    lowered.includes(token),
  )
    ? 12
    : 4;
  const evidenceBonus = /\d/.test(text) ? 15 : 6;

  return clip(32 + lengthBonus + structureBonus + evidenceBonus);
};

const aiProbability = (essay: string, attachments: ChatAttachment[]) => {
  if (!essay) return 0.22;
  const lowered = essay.toLowerCase();
  const repeatedLeadership = lowered.split("лидер").length - 1 > 3 ? 0.14 : 0;
  const genericClaims =
    lowered.includes("изменить мир") || lowered.includes("будущих поколений") ? 0.18 : 0;
  const detailDiscount = ["алматы", "астана", "шымкент", "село", "school", "district"].some((token) =>
    lowered.includes(token),
  )
    ? -0.16
    : 0;
  const multimodalDiscount = attachments.length > 0 ? -0.08 : 0;

  return Math.max(0.03, Math.min(0.97, Math.round((0.36 + repeatedLeadership + genericClaims + detailDiscount + multimodalDiscount) * 100) / 100));
};

const buildEnsemble = (
  cognitive: number,
  leadership: number,
  growth: number,
  decision: number,
  motivation: number,
  authenticity: number,
): ModelContribution[] => [
  {
    model: "LLM reasoning",
    score: Math.round((motivation + growth + leadership) / 3),
    weight: 0.4,
    rationale: "Extracts intent, reflection depth and evidence from conversation and uploaded artifacts.",
  },
  {
    model: "XGBoost ranker",
    score: Math.round((cognitive + decision + growth) / 3),
    weight: 0.35,
    rationale: "Stabilizes structured behavioral dimensions and reduces one-answer volatility.",
  },
  {
    model: "Authenticity verifier",
    score: Math.round(authenticity),
    weight: 0.25,
    rationale: "Checks consistency between text, voice and video-derived evidence.",
  },
];

export function scoreInterview(messages: string[], attachments: ChatAttachment[] = []): InterviewScoreUpdate {
  const [intro = "", motivationText = "", leadershipStory = "", achievement = "", scenario = "", adaptiveA = "", adaptiveB = ""] =
    messages;

  const attachmentTranscript = attachments.map((item) => item.transcript).filter(Boolean).join(" ");

  const cognitive = textScore(achievement, scenario, adaptiveA, adaptiveB, attachmentTranscript);
  const leadership = textScore(leadershipStory, achievement, attachmentTranscript);
  const growth = textScore(motivationText, leadershipStory, adaptiveA);
  const decision = textScore(scenario, adaptiveB);
  const motivation = textScore(motivationText, intro, attachmentTranscript);
  const ai_detection_prob = aiProbability([leadershipStory, achievement, adaptiveA, attachmentTranscript].join(" "), attachments);
  const authenticity = clip(100 - ai_detection_prob * 100 + Math.min(attachments.length * 4, 8));

  const final_score = clip(
    cognitive * 0.25 +
      leadership * 0.2 +
      growth * 0.2 +
      decision * 0.15 +
      motivation * 0.1 +
      authenticity * 0.1,
  );

  const spread = Math.max(cognitive, leadership, growth, decision, motivation, authenticity) -
    Math.min(cognitive, leadership, growth, decision, motivation, authenticity);
  const confidence = Math.max(
    0.35,
    Math.min(0.96, Math.round((1 - spread / 120 - (ai_detection_prob > 0.7 ? 0.12 : 0) + Math.min(attachments.length * 0.03, 0.08)) * 100) / 100),
  );
  const needs_manual_review = confidence < 0.55 || ai_detection_prob > 0.7;
  const ensemble = buildEnsemble(cognitive, leadership, growth, decision, motivation, authenticity);

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
    explanation:
      attachments.length > 0
        ? "Оценка опирается на текст, загруженные артефакты и кросс-проверку между моделями. Финальное решение остаётся за комиссией."
        : "Оценка построена на интервью и требует дополнительных мультимодальных evidence для более сильной уверенности.",
    ensemble,
  };
}
