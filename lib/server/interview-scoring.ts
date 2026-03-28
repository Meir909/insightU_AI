import type { InterviewScoreUpdate } from "@/lib/types";

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

const aiProbability = (essay: string) => {
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

  return Math.max(0.03, Math.min(0.97, Math.round((0.36 + repeatedLeadership + genericClaims + detailDiscount) * 100) / 100));
};

export function scoreInterview(messages: string[]): InterviewScoreUpdate {
  const [intro = "", motivationText = "", leadershipStory = "", achievement = "", scenario = "", adaptiveA = "", adaptiveB = ""] =
    messages;

  const cognitive = textScore(achievement, scenario, adaptiveA, adaptiveB);
  const leadership = textScore(leadershipStory, achievement);
  const growth = textScore(motivationText, leadershipStory, adaptiveA);
  const decision = textScore(scenario, adaptiveB);
  const motivation = textScore(motivationText, intro);
  const ai_detection_prob = aiProbability([leadershipStory, achievement, adaptiveA].join(" "));
  const authenticity = clip(100 - ai_detection_prob * 100);

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
  const confidence = Math.max(0.35, Math.min(0.96, Math.round((1 - spread / 120 - (ai_detection_prob > 0.7 ? 0.12 : 0)) * 100) / 100));
  const needs_manual_review = confidence < 0.55 || ai_detection_prob > 0.7;

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
  };
}
