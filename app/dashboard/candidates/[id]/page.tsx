import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CandidateDetailShell } from "@/components/dashboard/candidate-detail-shell";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  canVote,
  parseAuthSession,
} from "@/lib/server/auth";
import { getCandidate, getRanking } from "@/lib/api";
import { getCandidateEvaluationHistory } from "@/lib/server/prisma";

export async function generateStaticParams() {
  const candidates = await getRanking();
  return candidates.map((candidate) => ({ id: candidate.id }));
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidateData, evaluationHistory] = await Promise.all([
    getCandidate(id),
    getCandidateEvaluationHistory(id).catch(() => []),
  ]);
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!candidateData) {
    notFound();
  }

  const candidate = candidateData;

  const evalHistory = evaluationHistory.map((e) => ({
    id: e.id,
    overallScore: e.overallScore,
    confidence: e.confidence,
    evaluatorType: e.evaluatorType,
    reasoning: e.reasoning,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <CandidateDetailShell
      candidate={candidate}
      evaluationHistory={evalHistory}
      canCurrentUserVote={canVote(session?.role)}
    />
  );
}
