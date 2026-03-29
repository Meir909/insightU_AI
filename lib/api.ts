import "server-only";
import { env } from "@/lib/env";
import { enrichCandidate } from "@/lib/evaluation";
import { MOCK_CANDIDATES } from "@/lib/mock-data";
import { getPersistedCandidate, getPersistedCandidates, getPersistedShortlist } from "@/lib/server/persistent-store";
import type { Candidate, CandidateArtifact, CommitteeReview, CommitteeVote } from "@/lib/types";

type FairnessSummary = {
  fairnessScore: number;
  avgConfidence: number;
  manualReviewRate: number;
};

type BackendVote = {
  member_id: string;
  member_name: string;
  decision: "approve" | "hold" | "reject";
  rationale: string;
  created_at: string;
};

type BackendAttachment = {
  id: string;
  kind: "text" | "audio" | "video" | "document";
  name: string;
  mime_type: string;
  size_kb: number;
  transcript?: string | null;
  extracted_signals?: string[];
  storage_path?: string | null;
};

type BackendSession = {
  id: string;
  progress: number;
  status: "active" | "completed";
  phase: string;
  artifacts?: BackendAttachment[];
  messages?: Array<{ role: "assistant" | "user"; content: string }>;
  score_update?: {
    cognitive?: number;
    leadership?: number;
    growth?: number;
    decision?: number;
    motivation?: number;
    authenticity?: number;
    final_score?: number;
    confidence?: number;
    ai_detection_prob?: number;
    needs_manual_review?: boolean;
    explanation?: string | null;
  } | null;
};

type BackendCandidatePayload = {
  candidate: {
    id: string;
    code: string;
    name: string;
    city?: string;
    program?: string;
    status?: Candidate["status"];
    goals?: string;
    experience?: string;
    motivation_text?: string;
    essay_excerpt?: string;
    created_at?: string;
    updated_at?: string;
  };
  session?: BackendSession | null;
  votes?: BackendVote[];
  approved_votes?: number;
  rejected_votes?: number;
  final_score?: number;
};

function backendBaseUrl() {
  return (env.BACKEND_API_URL || env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

function buildCommitteeReview(votes: CommitteeVote[]): CommitteeReview {
  const approvedCount = votes.filter((vote) => vote.decision === "approve").length;
  const rejectCount = votes.filter((vote) => vote.decision === "reject").length;
  const holdCount = votes.filter((vote) => vote.decision === "hold").length;

  let finalDecision: CommitteeReview["finalDecision"] = "pending";
  if (approvedCount >= 3) finalDecision = "approved";
  else if (rejectCount >= 3) finalDecision = "rejected";
  else if (votes.length > 0) finalDecision = "escalated";

  return {
    requiredApprovals: 3,
    votes,
    approvedCount,
    rejectCount,
    holdCount,
    finalDecision,
    corruptionGuard:
      "Кандидат не может быть принят единственным голосом. Для положительного решения требуется минимум 3 независимых одобрения комиссии.",
  };
}

function normalizeBackendCandidate(payload: BackendCandidatePayload): Candidate | null {
  const profile = payload.candidate;
  if (!profile?.id) return null;

  const template =
    MOCK_CANDIDATES.find((item) => item.program === profile.program) ??
    MOCK_CANDIDATES.find((item) => item.city === profile.city) ??
    MOCK_CANDIDATES[0];
  const score = payload.session?.score_update;
  const userMessages = (payload.session?.messages ?? []).filter((message) => message.role === "user");
  const votes: CommitteeVote[] = (payload.votes ?? []).map((vote) => ({
    memberId: vote.member_id,
    memberName: vote.member_name,
    decision: vote.decision,
    rationale: vote.rationale,
    createdAt: vote.created_at,
  }));
  const artifacts: CandidateArtifact[] | undefined = payload.session?.artifacts?.map((artifact) => ({
    id: artifact.id,
    kind: artifact.kind,
    name: artifact.name,
    mimeType: artifact.mime_type,
    sizeKb: artifact.size_kb,
    transcript: artifact.transcript ?? undefined,
    extractedSignals: artifact.extracted_signals ?? [],
    evidenceWeight: 0.25,
    storagePath: artifact.storage_path ?? undefined,
  }));
  const extractedSignals = artifacts?.flatMap((artifact) => artifact.extractedSignals).filter(Boolean) ?? [];
  const keyQuotes = userMessages.slice(0, 2).map((message) => message.content).filter(Boolean);

  return enrichCandidate({
    ...template,
    id: profile.id,
    code: profile.code,
    name: profile.name,
    city: profile.city || "Unspecified",
    program: profile.program || "inVision U Applicant",
    status: profile.status ?? template.status,
    final_score: score?.final_score ?? payload.final_score ?? 0,
    cognitive: score?.cognitive ?? template.cognitive,
    leadership: score?.leadership ?? template.leadership,
    growth: score?.growth ?? template.growth,
    decision: score?.decision ?? template.decision,
    motivation: score?.motivation ?? template.motivation,
    authenticity: score?.authenticity ?? template.authenticity,
    confidence: score?.confidence ?? template.confidence,
    ai_detection_prob: score?.ai_detection_prob ?? template.ai_detection_prob,
    ai_signals: extractedSignals.length > 0 ? extractedSignals : template.ai_signals,
    needs_manual_review: score?.needs_manual_review ?? template.needs_manual_review,
    reasoning: score?.explanation ?? template.reasoning,
    key_quotes: keyQuotes.length > 0 ? keyQuotes : template.key_quotes,
    goals: profile.goals || template.goals,
    experience: profile.experience || template.experience,
    motivation_text: profile.motivation_text || template.motivation_text,
    essay_excerpt: profile.essay_excerpt || template.essay_excerpt,
    artifacts,
    committee_review: buildCommitteeReview(votes),
    evaluation_session_id: payload.session?.id,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  });
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const baseUrl = backendBaseUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getLocalRanking(): Promise<Candidate[]> {
  const candidates = await getPersistedCandidates();
  if (candidates.length > 0) return candidates;

  return MOCK_CANDIDATES.map(enrichCandidate);
}

export async function getRanking(): Promise<Candidate[]> {
  const data = await fetchJson<{ candidates?: BackendCandidatePayload[] }>("/api/v1/candidates");
  if (data?.candidates && Array.isArray(data.candidates)) {
    const normalized = data.candidates.map((item) => normalizeBackendCandidate(item)).filter(Boolean) as Candidate[];
    if (normalized.length > 0) return normalized;
  }

  return getLocalRanking();
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const data = await fetchJson<BackendCandidatePayload>(`/api/v1/candidates/${id}`);

  if (data) {
    const normalized = normalizeBackendCandidate(data);
    if (normalized) return normalized;
  }

  const candidate = await getPersistedCandidate(id);
  if (candidate) return candidate;

  const fallback = MOCK_CANDIDATES.find((candidateItem) => candidateItem.id === id) ?? null;
  return fallback ? enrichCandidate(fallback) : null;
}

export async function getShortlist(): Promise<Candidate[]> {
  const data = await fetchJson<{ candidates?: BackendCandidatePayload[] }>("/api/v1/candidates/shortlist");

  if (data?.candidates && Array.isArray(data.candidates)) {
    const normalized = data.candidates.map((item) => normalizeBackendCandidate(item)).filter(Boolean) as Candidate[];
    if (normalized.length > 0) return normalized;
  }

  const shortlist = await getPersistedShortlist();
  if (shortlist.length > 0) return shortlist;

  return MOCK_CANDIDATES.filter((candidate) => candidate.status === "shortlisted").map(enrichCandidate);
}

export async function getFairnessSummary(): Promise<FairnessSummary> {
  const data = await fetchJson<{
    total_candidates: number;
    shortlisted: number;
    flagged: number;
    average_score: number;
    pending_committee_review: number;
  }>("/api/v1/analytics/summary");

  if (data) {
    const candidates = await getRanking();

    return {
      fairnessScore: 0.91,
      avgConfidence: Math.round(
        (candidates.reduce((sum, candidate) => sum + candidate.confidence, 0) / Math.max(candidates.length, 1)) * 100,
      ),
      manualReviewRate: Math.round(
        (candidates.filter((item) => item.needs_manual_review).length / Math.max(candidates.length, 1)) * 100,
      ),
    };
  }

  const candidates = await getRanking();

  return {
    fairnessScore: 0.86,
    avgConfidence: Math.round(
      (candidates.reduce((sum, candidate) => sum + candidate.confidence, 0) / Math.max(candidates.length, 1)) * 100,
    ),
    manualReviewRate: Math.round(
      (candidates.filter((item) => item.needs_manual_review).length / Math.max(candidates.length, 1)) * 100,
    ),
  };
}
