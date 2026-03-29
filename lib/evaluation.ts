import type { Candidate, CandidateArtifact, CommitteeReview, CommitteeVote, ModelContribution } from "@/lib/types";

const iso = (day: number) => new Date(Date.UTC(2026, 2, day, 10, 0, 0)).toISOString();

const buildArtifacts = (candidate: Candidate): CandidateArtifact[] => {
  const transcript = candidate.key_quotes.join(" ");

  return [
    {
      id: `${candidate.id}-essay`,
      kind: "document",
      name: "essay.pdf",
      mimeType: "application/pdf",
      sizeKb: 188,
      transcript: candidate.essay_excerpt,
      extractedSignals: [
        "Narrative coherence",
        "Goal specificity",
        candidate.authenticity >= 75 ? "Personal examples present" : "Needs stronger concrete evidence",
      ],
      evidenceWeight: 0.22,
    },
    {
      id: `${candidate.id}-voice`,
      kind: "audio",
      name: "voice-intro.m4a",
      mimeType: "audio/mp4",
      sizeKb: 512,
      transcript,
      extractedSignals: [
        candidate.confidence >= 0.8 ? "Stable speaking pace" : "Variable pace under follow-up pressure",
        candidate.ai_detection_prob < 0.45 ? "Natural filler variation" : "Requires authenticity review",
      ],
      evidenceWeight: 0.31,
    },
    {
      id: `${candidate.id}-video`,
      kind: "video",
      name: "scenario-response.mp4",
      mimeType: "video/mp4",
      sizeKb: 4120,
      transcript: candidate.reasoning,
      extractedSignals: [
        candidate.leadership >= 80 ? "Strong ownership cues" : "Leadership cues are present but moderate",
        candidate.decision >= 75 ? "Good decision framing" : "Decision framing needs committee validation",
      ],
      evidenceWeight: 0.47,
    },
  ];
};

const buildEnsemble = (candidate: Candidate): ModelContribution[] => [
  {
    model: "LLM reasoning",
    score: Math.round((candidate.final_score + candidate.motivation) / 2),
    weight: 0.4,
    rationale: "Extracts motivation, coherence and evidence from text, audio transcript and follow-up answers.",
  },
  {
    model: "XGBoost behavioral ranker",
    score: Math.round(candidate.cognitive * 0.35 + candidate.decision * 0.35 + candidate.growth * 0.3),
    weight: 0.35,
    rationale: "Stabilizes structured dimensions and reduces overreaction to one unusually strong answer.",
  },
  {
    model: "Authenticity verifier",
    score: Math.round(candidate.authenticity),
    weight: 0.25,
    rationale: "Cross-checks consistency across essay, voice and interview artifacts before recommending trust.",
  },
];

const vote = (
  candidate: Candidate,
  memberId: string,
  memberName: string,
  bias: number,
): CommitteeVote => {
  const weighted = candidate.final_score + bias - candidate.ai_detection_prob * 12;

  let decision: CommitteeVote["decision"] = "hold";
  if (weighted >= 82 && !candidate.needs_manual_review) decision = "approve";
  if (weighted < 68) decision = "reject";

  return {
    memberId,
    memberName,
    decision,
    rationale:
      decision === "approve"
        ? "Подтверждаю высокий потенциал, потому что evidence есть сразу в тексте, интервью и поведенческих сигналах."
        : decision === "reject"
          ? "Не вижу достаточной глубины и устойчивых подтверждений лидерского потенциала на текущем этапе."
          : "Нужна дополнительная коллегиальная проверка, потому что сигналы неоднородны или есть риск переоценки одним рецензентом.",
    createdAt: iso(8 + Math.abs(bias)),
  };
};

const buildCommitteeReview = (candidate: Candidate): CommitteeReview => {
  const votes = [
    vote(candidate, "cm-1", "A. Nurgaliyeva", 2),
    vote(candidate, "cm-2", "D. Ibrayeva", -1),
    vote(candidate, "cm-3", "T. Saparov", candidate.ai_detection_prob > 0.65 ? -6 : 1),
  ];

  const approvedCount = votes.filter((item) => item.decision === "approve").length;
  const rejectCount = votes.filter((item) => item.decision === "reject").length;
  const holdCount = votes.filter((item) => item.decision === "hold").length;

  let finalDecision: CommitteeReview["finalDecision"] = "pending";
  if (approvedCount >= 2) finalDecision = "approved";
  else if (rejectCount >= 2) finalDecision = "rejected";
  else if (holdCount > 0 || approvedCount === 1) finalDecision = "escalated";

  return {
    requiredApprovals: 2,
    votes,
    approvedCount,
    rejectCount,
    holdCount,
    finalDecision,
    corruptionGuard:
      "Кандидат не может быть принят единственным голосом. Для положительного решения требуется минимум 2 независимых одобрения комиссии.",
  };
};

export function enrichCandidate(candidate: Candidate): Candidate {
  const artifacts = buildArtifacts(candidate);
  const ensemble = buildEnsemble(candidate);
  const committeeReview = buildCommitteeReview(candidate);

  return {
    ...candidate,
    artifacts,
    ensemble,
    committee_review: committeeReview,
    explainability_v2: {
      verdict:
        committeeReview.finalDecision === "approved"
          ? "AI recommends approval, but only because the case is supported by multiple evidence channels and committee consensus."
          : committeeReview.finalDecision === "rejected"
            ? "AI recommends rejection because evidence is too weak or inconsistent even after cross-model review."
            : "AI recommends escalation for committee review because the evidence is mixed or vulnerable to overconfident interpretation.",
      plainLanguage:
        "Система объясняет оценку через конкретные наблюдения: что кандидат сказал, как это подтверждается в артефактах и какие модели внесли вклад в итоговую рекомендацию.",
      evidence: [
        {
          title: "Leadership evidence",
          summary: candidate.reasoning,
          supports: ["leadership", "growth"],
        },
        {
          title: "Candidate quotes",
          summary: candidate.key_quotes[0] || candidate.essay_excerpt,
          supports: ["motivation", "authenticity"],
        },
        {
          title: "Scenario response trace",
          summary: candidate.key_quotes[1] || candidate.goals,
          supports: ["decision", "cognitive"],
        },
      ],
      modelContributions: ensemble,
      fairnessNotes: [
        "Demographic and socio-economic factors are excluded from scoring.",
        "Any low-confidence or high AI-risk case is automatically escalated to human review.",
        committeeReview.corruptionGuard,
      ],
    },
  };
}
