import "server-only";
import { enrichCandidate } from "@/lib/evaluation";
import {
  getAllCandidates,
  getCandidateById,
  getCandidateStats,
} from "@/lib/server/prisma";
import {
  getPersistedCandidate,
  getPersistedCandidates,
} from "@/lib/server/data-store";
import type {
  Candidate,
  CandidateArtifact,
  CommitteeReview,
  CommitteeVote,
} from "@/lib/types";

type FairnessSummary = {
  fairnessScore: number;
  avgConfidence: number;
  manualReviewRate: number;
  cohortAverageScore?: number;
  scoreSpread?: number;
  warningCount?: number;
};

function mapVotes(
  votes: NonNullable<Awaited<ReturnType<typeof getCandidateById>>>["committeeVotes"],
): CommitteeVote[] {
  return votes.map((vote) => ({
    memberId: vote.committeeId,
    memberName: vote.committee.name,
    decision:
      vote.decision === "approved"
        ? "approve"
        : vote.decision === "rejected"
          ? "reject"
          : "hold",
    rationale: vote.notes || vote.recommendation || "Решение комиссии сохранено.",
    createdAt: vote.createdAt.toISOString(),
  }));
}

function mapCommitteeReview(votes: CommitteeVote[]): CommitteeReview {
  const approvedCount = votes.filter((vote) => vote.decision === "approve").length;
  const rejectCount = votes.filter((vote) => vote.decision === "reject").length;
  const holdCount = votes.filter((vote) => vote.decision === "hold").length;

  return {
    requiredApprovals: 3,
    votes,
    approvedCount,
    rejectCount,
    holdCount,
    finalDecision:
      approvedCount >= 3
        ? "approved"
        : rejectCount >= 3
          ? "rejected"
          : votes.length > 0
            ? "escalated"
            : "pending",
    corruptionGuard:
      "Кандидат не может быть принят единоличным решением. Для положительного решения нужны минимум 3 независимых одобрения комиссии.",
  };
}

function mapArtifacts(
  artifacts: Array<{
    id: string;
    type: string;
    name: string;
    mimeType: string | null;
    size: number;
    analysis: unknown;
    url: string;
  }>,
): CandidateArtifact[] {
  return artifacts.map((artifact) => {
    const analysis =
      artifact.analysis && typeof artifact.analysis === "object"
        ? (artifact.analysis as {
            transcript?: string;
            summary?: string;
            keyPoints?: string[];
            highlights?: string[];
          })
        : undefined;

    return {
      id: artifact.id,
      kind: artifact.type === "image" ? "document" : (artifact.type as CandidateArtifact["kind"]),
      name: artifact.name,
      mimeType: artifact.mimeType || "application/octet-stream",
      sizeKb: Math.max(1, Math.round(artifact.size / 1024)),
      transcript: analysis?.transcript || analysis?.summary,
      extractedSignals: [...(analysis?.keyPoints || []), ...(analysis?.highlights || [])].slice(0, 8),
      evidenceWeight: 0.25,
      storagePath: artifact.url,
    };
  });
}

function mapCandidateFromRecord(
  record: NonNullable<Awaited<ReturnType<typeof getCandidateById>>>,
): Candidate {
  const latestEvaluation = record.evaluations[0];
  const votes = mapVotes(record.committeeVotes);
  const interview = record.interviewSession;
  const confidence = Math.max(
    0,
    Math.min(1, (latestEvaluation?.confidence ?? interview?.confidenceScore ?? 65) / 100),
  );
  const aiRisk = Math.max(0, Math.min(1, (interview?.aiRiskScore ?? 18) / 100));

  return enrichCandidate({
    id: record.id,
    code: record.code,
    name: record.fullName,
    city: record.city || "Не указан",
    program: record.institution || "Кандидат inVision U",
    status: record.status,
    final_score: record.overallScore ?? latestEvaluation?.overallScore ?? 0,
    cognitive: interview?.cognitiveScore ?? latestEvaluation?.problemSolving ?? 0,
    leadership: interview?.leadershipScore ?? latestEvaluation?.leadershipPotential ?? 0,
    growth: interview?.growthScore ?? latestEvaluation?.adaptability ?? 0,
    decision: interview?.decisionScore ?? latestEvaluation?.problemSolving ?? 0,
    motivation: interview?.motivationScore ?? latestEvaluation?.changeAgentMindset ?? 0,
    authenticity: interview?.authenticityScore ?? latestEvaluation?.authenticity ?? 0,
    confidence,
    ai_detection_prob: aiRisk,
    ai_signals: record.artifacts.flatMap((artifact) => {
      const analysis =
        artifact.analysis && typeof artifact.analysis === "object"
          ? (artifact.analysis as { redFlags?: string[]; keyPoints?: string[] })
          : undefined;

      return [...(analysis?.redFlags || []), ...(analysis?.keyPoints || [])];
    }),
    needs_manual_review: aiRisk >= 0.45 || confidence <= 0.65,
    reasoning:
      latestEvaluation?.reasoning ||
      "Оценка формируется на основе данных анкеты, загруженных артефактов и результатов AI-интервью. Финальное решение принимает комиссия.",
    key_quotes:
      interview?.messages
        .filter((message) => message.role === "user")
        .slice(0, 2)
        .map((message) => message.content) || [],
    goals: record.goals || "Цели будут заполнены после отправки анкеты.",
    experience: record.experience || "Опыт будет указан после отправки анкеты.",
    motivation_text: record.motivationText || record.whyInVision || "",
    essay_excerpt: record.changeAgentVision || "",
    artifacts: mapArtifacts(record.artifacts),
    committee_review: mapCommitteeReview(votes),
    evaluation_session_id: interview?.id,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

function mapCandidateSummary(record: Awaited<ReturnType<typeof getAllCandidates>>[number]): Candidate {
  const latestEvaluation = record.evaluations[0];
  const confidence = Math.max(0, Math.min(1, (latestEvaluation?.confidence ?? 65) / 100));

  return enrichCandidate({
    id: record.id,
    code: record.code,
    name: record.fullName,
    city: record.city || "Не указан",
    program: record.institution || "Кандидат inVision U",
    status: record.status,
    final_score: record.overallScore ?? latestEvaluation?.overallScore ?? 0,
    cognitive: 0,
    leadership: 0,
    growth: 0,
    decision: 0,
    motivation: 0,
    authenticity: 0,
    confidence,
    ai_detection_prob: 0.18,
    ai_signals: [],
    needs_manual_review: record.status === "flagged",
    reasoning:
      latestEvaluation?.reasoning || "Подробное объяснение появится после прохождения интервью и полной оценки.",
    key_quotes: [],
    goals: record.goals || "Цели будут заполнены после отправки анкеты.",
    experience: record.experience || "Опыт будет указан после отправки анкеты.",
    motivation_text: record.motivationText || "",
    essay_excerpt: record.changeAgentVision || "",
    artifacts: [],
    committee_review: {
      requiredApprovals: 3,
      votes: [],
      approvedCount: 0,
      rejectCount: 0,
      holdCount: 0,
      finalDecision: "pending",
      corruptionGuard:
        "Кандидат не может быть принят единоличным решением. Для положительного решения нужны минимум 3 независимых одобрения комиссии.",
    },
    evaluation_session_id: undefined,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  });
}

export async function getRanking(): Promise<Candidate[]> {
  try {
    const [prismaRows, persistedRows] = await Promise.allSettled([
      getAllCandidates().then((rows) => rows.map(mapCandidateSummary)),
      getPersistedCandidates(),
    ]);

    const prismaList = prismaRows.status === "fulfilled" ? prismaRows.value : [];
    const persistedList = persistedRows.status === "fulfilled" ? persistedRows.value : [];

    // Merge: persisted candidates that don't exist in Prisma
    const prismaIds = new Set(prismaList.map((c) => c.id));
    const extras = persistedList.filter((c) => !prismaIds.has(c.id));

    return [...prismaList, ...extras].sort((a, b) => b.final_score - a.final_score);
  } catch {
    // Full fallback to persisted store
    try {
      return await getPersistedCandidates();
    } catch {
      return [];
    }
  }
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  try {
    const prismaCandidate = await getCandidateById(id);
    if (prismaCandidate) {
      return mapCandidateFromRecord(prismaCandidate);
    }
  } catch {
    // Prisma unavailable — fall through to persisted store
  }

  // Fallback: look up in the JSON-based data store
  try {
    return await getPersistedCandidate(id);
  } catch {
    return null;
  }
}

export async function getShortlist(): Promise<Candidate[]> {
  try {
    const [prismaRows, persistedRows] = await Promise.allSettled([
      getAllCandidates("shortlisted").then((rows) => rows.map(mapCandidateSummary)),
      getPersistedCandidates().then((rows) =>
        rows.filter((c) => c.status === "shortlisted" || c.committee_review?.finalDecision === "approved"),
      ),
    ]);

    const prismaList = prismaRows.status === "fulfilled" ? prismaRows.value : [];
    const persistedList = persistedRows.status === "fulfilled" ? persistedRows.value : [];

    const prismaIds = new Set(prismaList.map((c) => c.id));
    const extras = persistedList.filter((c) => !prismaIds.has(c.id));

    return [...prismaList, ...extras];
  } catch {
    return [];
  }
}

export async function getFairnessSummary(): Promise<FairnessSummary> {
  try {
    const [stats, ranking] = await Promise.all([getCandidateStats(), getRanking()]);
    const averageScore =
      ranking.length > 0
        ? ranking.reduce((sum, candidate) => sum + candidate.final_score, 0) / ranking.length
        : 0;
    const cities = [...new Set(ranking.map((candidate) => candidate.city).filter(Boolean))];
    const cityAverages = cities
      .map((city) => {
        const cityCandidates = ranking.filter((candidate) => candidate.city === city);
        return cityCandidates.length > 0
          ? cityCandidates.reduce((sum, candidate) => sum + candidate.final_score, 0) /
              cityCandidates.length
          : 0;
      })
      .filter((value) => Number.isFinite(value));
    const scoreSpread =
      cityAverages.length > 1 ? Math.max(...cityAverages) - Math.min(...cityAverages) : 0;
    const manualReviewRate =
      stats.total > 0 ? Math.round(((stats.byStatus.flagged || 0) / stats.total) * 100) : 0;
    const fairnessScore = Math.max(
      0,
      Math.round((100 - scoreSpread * 1.5 - manualReviewRate * 0.2) * 10) / 10,
    );

    return {
      fairnessScore,
      avgConfidence: Math.round(
        (ranking.reduce((sum, candidate) => sum + candidate.confidence, 0) /
          Math.max(ranking.length, 1)) *
          100,
      ),
      manualReviewRate,
      cohortAverageScore: Math.round(averageScore * 10) / 10,
      scoreSpread: Math.round(scoreSpread * 10) / 10,
      warningCount: Number(scoreSpread > 15) + Number(manualReviewRate > 35),
    };
  } catch {
    return {
      fairnessScore: 0,
      avgConfidence: 0,
      manualReviewRate: 0,
      cohortAverageScore: 0,
      scoreSpread: 0,
      warningCount: 0,
    };
  }
}

export interface ProactiveTalent {
  id: string;
  code: string;
  name: string;
  city: string;
  status: string;
  final_score: number;
  leadership: number;
  growth: number;
  confidence: number;
  ai_detection_prob: number;
  tags: string[];
  missingSteps: string[];
}

export async function getProactiveTalents(): Promise<ProactiveTalent[]> {
  try {
    const all = await getRanking();
    return all
      .filter(
        (c) =>
          c.final_score >= 60 &&
          c.status !== "shortlisted" &&
          c.status !== "rejected" &&
          c.status !== "accepted",
      )
      .map((c) => {
        const tags: string[] = [];
        const missingSteps: string[] = [];

        if (c.leadership >= 70) tags.push("Лидерский потенциал");
        if (c.growth >= 70) tags.push("Высокий рост");
        if (c.final_score >= 75) tags.push("Топ-кандидат");
        if (c.authenticity >= 70) tags.push("Аутентичность");
        if (c.ai_detection_prob < 0.2) tags.push("Низкий AI риск");

        if (c.status === "in_progress") missingSteps.push("Интервью не завершено");
        if ((c.status as string) === "pending") missingSteps.push("Ожидает проверки");
        if (c.needs_manual_review) missingSteps.push("Требует ручной проверки");
        if (c.confidence < 0.65) missingSteps.push("Низкая уверенность AI");

        return {
          id: c.id,
          code: c.code,
          name: c.name,
          city: c.city,
          status: c.status,
          final_score: c.final_score,
          leadership: c.leadership,
          growth: c.growth,
          confidence: c.confidence,
          ai_detection_prob: c.ai_detection_prob,
          tags,
          missingSteps,
        };
      })
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, 20);
  } catch {
    return [];
  }
}
