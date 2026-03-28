import { env } from "@/lib/env";
import { MOCK_CANDIDATES } from "@/lib/mock-data";
import type { Candidate } from "@/lib/types";

type FairnessSummary = {
  fairnessScore: number;
  avgConfidence: number;
  manualReviewRate: number;
};

function normalizeCandidate(candidate: Partial<Candidate> & { id?: string }): Candidate | null {
  if (!candidate.id) return null;

  const fallback = MOCK_CANDIDATES.find((item) => item.id === candidate.id);
  if (!fallback) return null;

  return {
    ...fallback,
    ...candidate,
    ai_signals: candidate.ai_signals ?? fallback.ai_signals,
    key_quotes: candidate.key_quotes ?? fallback.key_quotes,
  };
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    return null;
  }

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
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

export async function getRanking(): Promise<Candidate[]> {
  const data = await fetchJson<unknown>("/api/v1/ranking");
  if (Array.isArray(data)) {
    const normalized = data
      .map((item) => normalizeCandidate(item as Partial<Candidate>))
      .filter(Boolean) as Candidate[];
    if (normalized.length > 0) return normalized;
  }

  if (data && typeof data === "object" && "candidates" in data && Array.isArray(data.candidates)) {
    const normalized = data.candidates
      .map((item) => normalizeCandidate(item as Partial<Candidate>))
      .filter(Boolean) as Candidate[];
    if (normalized.length > 0) return normalized;
  }

  return MOCK_CANDIDATES;
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const data = await fetchJson<unknown>(`/api/v1/candidates/${id}`);

  if (data && typeof data === "object") {
    const normalized = normalizeCandidate(data as Partial<Candidate>);
    if (normalized) return normalized;
  }

  return MOCK_CANDIDATES.find((candidate) => candidate.id === id) ?? null;
}

export async function getShortlist(): Promise<Candidate[]> {
  const data = await fetchJson<unknown>("/api/v1/shortlist");

  if (Array.isArray(data)) {
    const normalized = data
      .map((item) => normalizeCandidate(item as Partial<Candidate>))
      .filter(Boolean) as Candidate[];
    if (normalized.length > 0) return normalized;
  }

  return MOCK_CANDIDATES.filter((candidate) => candidate.status === "shortlisted");
}

export async function getFairnessSummary(): Promise<FairnessSummary> {
  const data = await fetchJson<unknown>("/api/v1/fairness/report");

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const fairnessScore = Number(record.fairnessScore ?? record.disparateImpact ?? 0.86);
    const avgConfidence = Number(record.avgConfidence ?? 81);
    const manualReviewRate = Number(record.manualReviewRate ?? 20);

    return { fairnessScore, avgConfidence, manualReviewRate };
  }

  return {
    fairnessScore: 0.86,
    avgConfidence: Math.round(
      (MOCK_CANDIDATES.reduce((sum, candidate) => sum + candidate.confidence, 0) /
        MOCK_CANDIDATES.length) *
        100,
    ),
    manualReviewRate: Math.round(
      (MOCK_CANDIDATES.filter((item) => item.needs_manual_review).length / MOCK_CANDIDATES.length) *
        100,
    ),
  };
}
