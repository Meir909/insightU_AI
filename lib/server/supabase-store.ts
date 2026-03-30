import { randomUUID } from "crypto";
import { enrichCandidate } from "@/lib/evaluation";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type {
  Candidate,
  ChatAttachment,
  ChatMessage,
  CommitteeReview,
  CommitteeVote,
  CommitteeVoteDecision,
  InterviewScoreUpdate,
} from "@/lib/types";

const REQUIRED_APPROVALS = 3;
const STORAGE_BUCKET = "candidate-artifacts";

type CandidateRow = {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  city: string;
  program: string;
  goals: string;
  experience: string;
  motivation_text: string;
  essay_excerpt: string;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  candidate_id: string;
  auth_session_id: string;
  messages: ChatMessage[];
  artifacts: ChatAttachment[];
  progress: number;
  status: "active" | "completed";
  phase: string;
  score_update: InterviewScoreUpdate | null;
  created_at: string;
  updated_at: string;
};

type CommitteeMemberRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type VoteRow = {
  candidate_id: string;
  member_id: string;
  member_name: string;
  decision: CommitteeVoteDecision;
  rationale: string;
  created_at: string;
};

function computeCommitteeReview(votes: CommitteeVote[]): CommitteeReview {
  const approvedCount = votes.filter((item) => item.decision === "approve").length;
  const rejectCount = votes.filter((item) => item.decision === "reject").length;
  const holdCount = votes.filter((item) => item.decision === "hold").length;

  let finalDecision: CommitteeReview["finalDecision"] = "pending";
  if (approvedCount >= REQUIRED_APPROVALS) finalDecision = "approved";
  else if (rejectCount >= REQUIRED_APPROVALS) finalDecision = "rejected";
  else if (votes.length > 0) finalDecision = "escalated";

  return {
    requiredApprovals: REQUIRED_APPROVALS,
    votes,
    approvedCount,
    rejectCount,
    holdCount,
    finalDecision,
    corruptionGuard:
      "Кандидат не может быть принят единственным голосом. Для положительного решения требуется минимум 3 независимых одобрения комиссии.",
  };
}

function mapCandidate(row: CandidateRow, session?: SessionRow | null, voteRows: VoteRow[] = []): Candidate {
  const score = session?.score_update;
  const votes: CommitteeVote[] = voteRows.map((item) => ({
    memberId: item.member_id,
    memberName: item.member_name,
    decision: item.decision,
    rationale: item.rationale,
    createdAt: item.created_at,
  }));
  const committeeReview = computeCommitteeReview(votes);

  return enrichCandidate({
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
    program: row.program,
    status:
      committeeReview.finalDecision === "approved"
        ? "shortlisted"
        : committeeReview.finalDecision === "rejected"
          ? "rejected"
          : session?.status === "completed"
            ? score?.needs_manual_review
              ? "flagged"
              : "completed"
            : "in_progress",
    final_score: score?.final_score ?? 0,
    cognitive: score?.cognitive ?? 0,
    leadership: score?.leadership ?? 0,
    growth: score?.growth ?? 0,
    decision: score?.decision ?? 0,
    motivation: score?.motivation ?? 0,
    authenticity: score?.authenticity ?? 0,
    confidence: score?.confidence ?? 0,
    ai_detection_prob: score?.ai_detection_prob ?? 0.22,
    ai_signals:
      session?.artifacts?.flatMap((item) => item.extractedSignals ?? []).slice(0, 4) ?? ["Awaiting richer multimodal evidence"],
    needs_manual_review: score?.needs_manual_review ?? true,
    reasoning: score?.explanation || "Evaluation session is active. The system is collecting evidence before final committee review.",
    key_quotes: session?.messages.filter((item) => item.role === "user").map((item) => item.content.slice(0, 180)).slice(0, 2) ?? [],
    goals: row.goals,
    experience: row.experience,
    motivation_text: row.motivation_text,
    essay_excerpt: row.essay_excerpt,
    artifacts: (session?.artifacts ?? []).map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      name: artifact.name,
      mimeType: artifact.mimeType,
      sizeKb: artifact.sizeKb,
      transcript: artifact.transcript,
      extractedSignals: artifact.extractedSignals ?? [],
      evidenceWeight: session?.artifacts?.length ? 1 / session.artifacts.length : 1,
      storagePath: artifact.storagePath,
    })),
    ensemble: score?.ensemble ?? [],
    committee_review: committeeReview,
    evaluation_session_id: session?.id,
    created_at: row.created_at,
    updated_at: session?.updated_at ?? row.updated_at,
  });
}

export async function registerCandidateProfile({
  authSessionId,
  name,
  email,
  phone,
}: {
  authSessionId: string;
  name: string;
  email?: string;
  phone?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: existingSession } = await supabase
    .from("evaluation_sessions")
    .select("id, candidate_id")
    .eq("auth_session_id", authSessionId)
    .maybeSingle();

  if (existingSession) {
    return {
      candidateId: existingSession.candidate_id,
      sessionId: existingSession.id,
    };
  }

  const candidateId = `cand-${randomUUID().slice(0, 8)}`;
  const sessionId = `eval-${randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();

  const { count } = await supabase.from("candidates").select("*", { count: "exact", head: true });
  const numeric = String((count ?? 0) + 2401).padStart(4, "0");

  await supabase.from("candidates").insert({
    id: candidateId,
    code: `IU-${numeric}`,
    name,
    email,
    phone,
    city: "Unspecified",
    program: "inVision U Applicant",
    goals: "To be collected during the interview.",
    experience: "To be collected during the interview.",
    motivation_text: "To be collected during the interview.",
    essay_excerpt: "To be collected during the interview.",
    created_at: now,
    updated_at: now,
  });

  await supabase.from("evaluation_sessions").insert({
    id: sessionId,
    candidate_id: candidateId,
    auth_session_id: authSessionId,
    messages: [],
    artifacts: [],
    progress: 12,
    status: "active",
    phase: "Foundation",
    score_update: null,
    created_at: now,
    updated_at: now,
  });

  return { candidateId, sessionId };
}

export async function registerCommitteeMember({ name, email }: { name: string; email: string }) {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("committee_members").select("*").eq("email", email).maybeSingle();
  if (existing) return existing as CommitteeMemberRow;

  const member: CommitteeMemberRow = {
    id: `cm-${randomUUID().slice(0, 8)}`,
    name,
    email,
    created_at: new Date().toISOString(),
  };
  await supabase.from("committee_members").insert(member);
  return member;
}

export async function resolveCommitteeMember(email?: string, name?: string) {
  if (!email) return null;
  return registerCommitteeMember({ email, name: name || email });
}

export async function getPersistedSessionByAuthSession(authSessionId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("evaluation_sessions").select("*").eq("auth_session_id", authSessionId).maybeSingle();
  return (data as SessionRow | null) ?? null;
}

export async function getOrCreatePersistedEvaluationSession(authSessionId: string, candidateName: string) {
  const existing = await getPersistedSessionByAuthSession(authSessionId);
  if (existing) return existing;
  const { sessionId } = await registerCandidateProfile({ authSessionId, name: candidateName });
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("evaluation_sessions").select("*").eq("id", sessionId).single();
  return data as SessionRow;
}

export async function saveInterviewState(input: {
  authSessionId: string;
  candidateName: string;
  messages: ChatMessage[];
  artifacts: ChatAttachment[];
  progress: number;
  status: "active" | "completed";
  phase: string;
  scoreUpdate: InterviewScoreUpdate | null;
}) {
  const supabase = getSupabaseAdmin();
  let session = await getPersistedSessionByAuthSession(input.authSessionId);
  if (!session) {
    await registerCandidateProfile({ authSessionId: input.authSessionId, name: input.candidateName });
    session = await getOrCreatePersistedEvaluationSession(input.authSessionId, input.candidateName);
  }

  const now = new Date().toISOString();
  await supabase
    .from("evaluation_sessions")
    .update({
      messages: input.messages,
      artifacts: input.artifacts,
      progress: input.progress,
      status: input.status,
      phase: input.phase,
      score_update: input.scoreUpdate,
      updated_at: now,
    })
    .eq("auth_session_id", input.authSessionId);

  const firstUserText = input.messages.find((item) => item.role === "user")?.content;
  const latestUserText = [...input.messages].reverse().find((item) => item.role === "user")?.content;

  await supabase
    .from("candidates")
    .update({
      name: input.candidateName,
      motivation_text: latestUserText || "To be collected during the interview.",
      goals: latestUserText || "To be collected during the interview.",
      experience: firstUserText || "To be collected during the interview.",
      essay_excerpt: firstUserText || "To be collected during the interview.",
      updated_at: now,
    })
    .eq("id", session.candidate_id);

  return getOrCreatePersistedEvaluationSession(input.authSessionId, input.candidateName);
}

export async function getPersistedCandidates(): Promise<Candidate[]> {
  const supabase = getSupabaseAdmin();
  const [{ data: candidates }, { data: sessions }, { data: votes }] = await Promise.all([
    supabase.from("candidates").select("*").order("created_at", { ascending: false }),
    supabase.from("evaluation_sessions").select("*"),
    supabase.from("committee_votes").select("*"),
  ]);

  return ((candidates as CandidateRow[] | null) ?? []).map((candidate) =>
    mapCandidate(
      candidate,
      ((sessions as SessionRow[] | null) ?? []).find((item) => item.candidate_id === candidate.id),
      ((votes as VoteRow[] | null) ?? []).filter((item) => item.candidate_id === candidate.id),
    ),
  );
}

export async function getPersistedCandidate(id: string): Promise<Candidate | null> {
  const supabase = getSupabaseAdmin();
  const [{ data: candidate }, { data: session }, { data: votes }] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", id).maybeSingle(),
    supabase.from("evaluation_sessions").select("*").eq("candidate_id", id).maybeSingle(),
    supabase.from("committee_votes").select("*").eq("candidate_id", id),
  ]);

  if (!candidate) return null;
  return mapCandidate(candidate as CandidateRow, (session as SessionRow | null) ?? undefined, (votes as VoteRow[] | null) ?? []);
}

export async function getPersistedShortlist(): Promise<Candidate[]> {
  const candidates = await getPersistedCandidates();
  return candidates.filter((item) => item.committee_review?.finalDecision === "approved" || item.status === "shortlisted");
}

export async function recordCommitteeVote(input: {
  candidateId: string;
  memberId: string;
  memberName: string;
  decision: CommitteeVoteDecision;
  rationale: string;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from("committee_votes").upsert({
    candidate_id: input.candidateId,
    member_id: input.memberId,
    member_name: input.memberName,
    decision: input.decision,
    rationale: input.rationale,
    created_at: new Date().toISOString(),
  });

  return getPersistedCandidate(input.candidateId);
}

export async function persistUploadedArtifactMeta(attachment: ChatAttachment) {
  return attachment;
}

export async function saveUploadedBinary(filename: string, bytes: Uint8Array, mimeType: string) {
  const supabase = getSupabaseAdmin();
  const safe = `${randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(safe, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) {
    throw error;
  }
  return `${STORAGE_BUCKET}/${safe}`;
}
