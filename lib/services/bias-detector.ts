/**
 * Bias Detector — Anti-Corruption Guard
 *
 * Detects statistical anomalies in committee voting patterns.
 * Uses z-score to identify outlier voters.
 * Pure math — no LLM, no external calls.
 */

export interface VoteData {
  memberId: string;
  memberName: string;
  score: number; // 0–100 formal score
  decision: "approved" | "rejected" | "hold";
  rationale: string;
}

export interface BiasCheckResult {
  hasAnomaly: boolean;
  outlierVoters: string[];
  zScores: Record<string, number>;
  scoreVariance: number;
  scoreMean: number;
  recommendation: "normal" | "flag_for_review" | "insufficient_votes";
  details: string;
}

export function detectBias(votes: VoteData[]): BiasCheckResult {
  if (votes.length < 2) {
    return {
      hasAnomaly: false,
      outlierVoters: [],
      zScores: {},
      scoreVariance: 0,
      scoreMean: 0,
      recommendation: "insufficient_votes",
      details: "Недостаточно голосов для анализа смещения",
    };
  }

  const scores = votes.map((v) => v.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const std = Math.sqrt(variance);

  const zScores: Record<string, number> = {};
  const outliers: string[] = [];

  for (const vote of votes) {
    const z = std > 0 ? Math.abs(vote.score - mean) / std : 0;
    zScores[vote.memberId] = Math.round(z * 100) / 100;
    // z > 2.0 = statistical outlier (exceeds 2 standard deviations)
    if (z > 2.0) {
      outliers.push(vote.memberName);
    }
  }

  const hasAnomaly = outliers.length > 0;

  return {
    hasAnomaly,
    outlierVoters: outliers,
    zScores,
    scoreVariance: Math.round(variance * 10) / 10,
    scoreMean: Math.round(mean * 10) / 10,
    recommendation: hasAnomaly ? "flag_for_review" : "normal",
    details: hasAnomaly
      ? `Обнаружено аномальное голосование: ${outliers.join(", ")} отклонились более чем на 2σ от среднего (${mean.toFixed(1)}). Рекомендуется дополнительная проверка.`
      : `Все голоса в пределах нормы. Среднее: ${mean.toFixed(1)}, Вариация: ${variance.toFixed(1)}.`,
  };
}

/**
 * Validate that a vote justification is substantive, not generic.
 */
const GENERIC_JUSTIFICATIONS = [
  "хорошо", "плохо", "норм", "нет", "да", "ок", "ok", "good", "bad",
  "looks good", "seems fine", "not a good fit", "i agree",
];

export function validateJustification(rationale: string): { valid: boolean; issues: string[] } {
  const text = rationale.trim().toLowerCase();
  const issues: string[] = [];

  if (text.length < 30) {
    issues.push("Обоснование слишком короткое (минимум 30 символов)");
  }

  if (GENERIC_JUSTIFICATIONS.some((g) => text === g || text.startsWith(g + " "))) {
    issues.push("Слишком общее обоснование — укажите конкретные наблюдения");
  }

  // Check for at least one observation (a sentence with a verb)
  const hasSubstance = /[а-яёА-ЯЁa-zA-Z]{3,}\s+[а-яёА-ЯЁa-zA-Z]{3,}/.test(rationale);
  if (!hasSubstance && rationale.length < 50) {
    issues.push("Добавьте конкретные наблюдения из интервью или материалов кандидата");
  }

  return { valid: issues.length === 0, issues };
}
