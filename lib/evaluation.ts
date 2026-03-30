import type { Candidate, CommitteeReview, ExplainabilityEvidence, ModelContribution } from "@/lib/types";

function buildEmptyCommitteeReview(): CommitteeReview {
  return {
    requiredApprovals: 3,
    votes: [],
    approvedCount: 0,
    rejectCount: 0,
    holdCount: 0,
    finalDecision: "pending",
    corruptionGuard:
      "Кандидат не может быть принят единственным голосом. Для положительного решения требуется минимум 3 независимых одобрения комиссии.",
  };
}

function buildDerivedEnsemble(candidate: Candidate): ModelContribution[] {
  return [
    {
      model: "Structured score aggregator",
      score: Math.round(candidate.final_score),
      weight: 0.5,
      rationale: "Aggregates structured interview, artifact and review signals already stored in the product.",
    },
    {
      model: "Behavioral consistency layer",
      score: Math.round((candidate.leadership + candidate.authenticity + candidate.decision) / 3),
      weight: 0.3,
      rationale: "Measures consistency between leadership, authenticity and decision quality dimensions.",
    },
    {
      model: "Risk and confidence layer",
      score: Math.round((candidate.confidence * 100 + (1 - candidate.ai_detection_prob) * 100) / 2),
      weight: 0.2,
      rationale: "Balances confidence and authenticity-risk before surfacing recommendations to the commission.",
    },
  ];
}

export function enrichCandidate(candidate: Candidate): Candidate {
  const committeeReview = candidate.committee_review ?? buildEmptyCommitteeReview();
  const evidence: ExplainabilityEvidence[] = [
    { title: "Цели кандидата", summary: candidate.goals, supports: ["motivation", "growth"] } as ExplainabilityEvidence,
    { title: "Опыт и кейсы", summary: candidate.experience, supports: ["leadership", "decision"] } as ExplainabilityEvidence,
    { title: "AI reasoning", summary: candidate.reasoning, supports: ["cognitive", "authenticity"] } as ExplainabilityEvidence,
  ].filter((item) => item.summary);

  return {
    ...candidate,
    artifacts: candidate.artifacts ?? [],
    ensemble: candidate.ensemble ?? buildDerivedEnsemble(candidate),
    committee_review: committeeReview,
    explainability_v2:
      candidate.explainability_v2 ??
      {
        verdict:
          candidate.final_score >= 75
            ? "Система видит достаточный потенциал для дальнейшего review комиссией."
            : "Система рекомендует ручную проверку или дополнительную оценку до решения комиссии.",
        plainLanguage:
          "Объяснение строится только на реально сохранённых данных кандидата: интервью, артефактах, структурных score и голосах комиссии.",
        evidence,
        modelContributions: candidate.ensemble ?? buildDerivedEnsemble(candidate),
        fairnessNotes: [
          "Финальное решение принимает комиссия, а не AI.",
          committeeReview.corruptionGuard,
        ],
      },
  };
}
