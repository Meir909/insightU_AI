/**
 * Predictive Analytics Service
 *
 * Generates forward-looking insights based on current candidate cohort data.
 * No ML model — uses statistical patterns and rule-based forecasting.
 * Runs server-side, no external API calls.
 */

import type { Candidate } from "@/lib/types";

export interface PredictiveInsights {
  // Forecasts
  expectedShortlistCount: number;    // How many likely to be shortlisted
  shortlistConversionRate: number;   // % of completed candidates → shortlist

  // Risk signals
  atRiskCount: number;               // Candidates at risk of being missed
  atRiskCandidates: Array<{
    id: string;
    code: string;
    name: string;
    score: number;
    reason: string;
  }>;

  // Hidden gems
  hiddenGemCount: number;
  hiddenGems: Array<{
    id: string;
    code: string;
    name: string;
    score: number;
    strengths: string[];
  }>;

  // Cohort trends
  cohortQualityTrend: "improving" | "stable" | "declining";
  cohortInsight: string;

  // Recommendations for committee
  recommendedActions: string[];

  // Funnel metrics
  funnelStats: {
    total: number;
    inProgress: number;
    completed: number;
    shortlisted: number;
    rejected: number;
    flagged: number;
  };
}

export function generatePredictiveInsights(candidates: Candidate[]): PredictiveInsights {
  const total = candidates.length;

  // Status breakdown
  const inProgress = candidates.filter((c) => c.status === "in_progress").length;
  const completed = candidates.filter((c) => c.status === "completed").length;
  const shortlisted = candidates.filter((c) => c.status === "shortlisted").length;
  const rejected = candidates.filter((c) => c.status === "rejected").length;
  const flagged = candidates.filter((c) => c.status === "flagged").length;

  // Conversion rate: shortlisted / (completed + shortlisted + rejected) — historical
  const decided = completed + shortlisted + rejected;
  const shortlistConversionRate = decided > 0 ? Math.round((shortlisted / decided) * 100) : 0;

  // Expected shortlist from in-progress: apply historical conversion
  const expectedFromInProgress = Math.round(
    inProgress * (shortlistConversionRate / 100 || 0.35),
  );
  const expectedShortlistCount = shortlisted + expectedFromInProgress;

  // At-risk: high score but flagged or ai_detection_prob > 0.5 or low confidence
  const atRiskCandidates = candidates
    .filter(
      (c) =>
        c.final_score >= 60 &&
        (c.ai_detection_prob > 0.5 || c.confidence < 0.55 || c.status === "flagged"),
    )
    .map((c) => {
      let reason = "";
      if (c.ai_detection_prob > 0.5) reason = `Высокий AI-риск (${Math.round(c.ai_detection_prob * 100)}%)`;
      else if (c.confidence < 0.55) reason = `Низкая уверенность AI (${Math.round(c.confidence * 100)}%)`;
      else if (c.status === "flagged") reason = "Отмечен для проверки";
      return { id: c.id, code: c.code, name: c.name || c.code, score: c.final_score, reason };
    })
    .slice(0, 5);

  // Hidden gems: not shortlisted, score 65-79, high leadership or growth
  const hiddenGems = candidates
    .filter(
      (c) =>
        c.final_score >= 65 &&
        c.final_score < 80 &&
        c.status !== "shortlisted" &&
        c.status !== "rejected" &&
        (c.leadership >= 70 || c.growth >= 70),
    )
    .map((c) => {
      const strengths: string[] = [];
      if (c.leadership >= 70) strengths.push(`Лидерство: ${c.leadership}`);
      if (c.growth >= 70) strengths.push(`Рост: ${c.growth}`);
      if (c.motivation >= 70) strengths.push(`Мотивация: ${c.motivation}`);
      if (c.authenticity >= 70) strengths.push(`Аутентичность: ${c.authenticity}`);
      return { id: c.id, code: c.code, name: c.name || c.code, score: c.final_score, strengths };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Cohort quality trend — based on avg score distribution
  const avgScore = total > 0
    ? candidates.reduce((s, c) => s + c.final_score, 0) / total
    : 0;
  const highQualityPct = total > 0
    ? (candidates.filter((c) => c.final_score >= 70).length / total) * 100
    : 0;

  let cohortQualityTrend: "improving" | "stable" | "declining" = "stable";
  let cohortInsight = "";

  if (highQualityPct >= 40) {
    cohortQualityTrend = "improving";
    cohortInsight = `${Math.round(highQualityPct)}% кандидатов набирают 70+ баллов — сильный поток.`;
  } else if (highQualityPct < 20) {
    cohortQualityTrend = "declining";
    cohortInsight = `Только ${Math.round(highQualityPct)}% кандидатов набирают 70+ баллов. Рекомендуем расширить охват.`;
  } else {
    cohortInsight = `Средний балл по когорте: ${Math.round(avgScore)}. Поток стабильный.`;
  }

  // Recommended actions
  const recommendedActions: string[] = [];

  if (atRiskCandidates.length > 0) {
    recommendedActions.push(
      `Проверьте ${atRiskCandidates.length} кандидат${atRiskCandidates.length === 1 ? "а" : "ов"} с высоким потенциалом и риск-флагами.`,
    );
  }
  if (hiddenGems.length > 0) {
    recommendedActions.push(
      `${hiddenGems.length} кандидат${hiddenGems.length === 1 ? " показывает" : "ов показывают"} сильные лидерские сигналы — рассмотрите для шорт-листа.`,
    );
  }
  if (inProgress > 0) {
    recommendedActions.push(
      `${inProgress} кандидат${inProgress === 1 ? " ещё проходит" : "ов ещё проходят"} интервью. Ожидайте ~${expectedFromInProgress} новых кандидатов в шорт-лист.`,
    );
  }
  if (flagged > 0) {
    recommendedActions.push(
      `${flagged} кандидат${flagged === 1 ? " отмечен" : "ов отмечено"} для ручной проверки. Требует решения комиссии.`,
    );
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("Все кандидаты обработаны. Процесс отбора завершён.");
  }

  return {
    expectedShortlistCount,
    shortlistConversionRate,
    atRiskCount: atRiskCandidates.length,
    atRiskCandidates,
    hiddenGemCount: hiddenGems.length,
    hiddenGems,
    cohortQualityTrend,
    cohortInsight,
    recommendedActions,
    funnelStats: { total, inProgress, completed, shortlisted, rejected, flagged },
  };
}
