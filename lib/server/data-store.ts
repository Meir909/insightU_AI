import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { enrichCandidate } from "@/lib/evaluation";
import { MOCK_CANDIDATES } from "@/lib/mock-data";
import type {
  Candidate,
  ChatAttachment,
  ChatMessage,
  CommitteeReview,
  CommitteeVote,
  CommitteeVoteDecision,
  InterviewScoreUpdate,
} from "@/lib/types";

type PersistedCandidate = {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  city: string;
  program: string;
  goals: string;
  experience: string;
  motivation_text: string;
  essay_excerpt: string;
  created_at: string;
  updated_at: string;
};

type PersistedEvaluationSession = {
  id: string;
  candidateId: string;
  authSessionId: string;
  messages: ChatMessage[];
  artifacts: ChatAttachment[];
  progress: number;
  status: "active" | "completed";
  phase: string;
  scoreUpdate: InterviewScoreUpdate | null;
  createdAt: string;
  updatedAt: string;
};

type PersistedCommitteeMember = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type PersistedCommitteeVote = CommitteeVote & {
  candidateId: string;
};

type PersistedDb = {
  candidates: PersistedCandidate[];
  sessions: PersistedEvaluationSession[];
  committeeMembers: PersistedCommitteeMember[];
  votes: PersistedCommitteeVote[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "insightu-db.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const REQUIRED_APPROVALS = 3;

const baseDb: PersistedDb = {
  candidates: [],
  sessions: [],
  committeeMembers: [],
  votes: [],
};

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOADS_DIR, { recursive: true });
}

async function readDb(): Promise<PersistedDb> {
  await ensureDataDir();

  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as PersistedDb;
    return {
      candidates: parsed.candidates ?? [],
      sessions: parsed.sessions ?? [],
      committeeMembers: parsed.committeeMembers ?? [],
      votes: parsed.votes ?? [],
    };
  } catch {
    await writeFile(DB_PATH, JSON.stringify(baseDb, null, 2), "utf8");
    return structuredClone(baseDb);
  }
}

async function writeDb(db: PersistedDb) {
  await ensureDataDir();
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

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

function buildPersistedCandidateView(
  candidate: PersistedCandidate,
  session: PersistedEvaluationSession | undefined,
  votes: CommitteeVote[],
): Candidate {
  const fallback = MOCK_CANDIDATES[0];
  const score = session?.scoreUpdate;
  const artifacts = session?.artifacts ?? [];
  const committeeReview = computeCommitteeReview(votes);

  const base: Candidate = {
    id: candidate.id,
    code: candidate.code,
    name: candidate.name,
    city: candidate.city || fallback.city,
    program: candidate.program || fallback.program,
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
      artifacts.flatMap((item) => item.extractedSignals ?? []).slice(0, 4).length > 0
        ? artifacts.flatMap((item) => item.extractedSignals ?? []).slice(0, 4)
        : ["Awaiting richer multimodal evidence"],
    needs_manual_review: score?.needs_manual_review ?? true,
    reasoning: score?.explanation || "Evaluation session is active. The system is collecting evidence before final committee review.",
    key_quotes: session?.messages.filter((item) => item.role === "user").map((item) => item.content.slice(0, 180)).slice(0, 2) ?? [],
    goals: candidate.goals,
    experience: candidate.experience,
    motivation_text: candidate.motivation_text,
    essay_excerpt: candidate.essay_excerpt,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      name: artifact.name,
      mimeType: artifact.mimeType,
      sizeKb: artifact.sizeKb,
      transcript: artifact.transcript,
      extractedSignals: artifact.extractedSignals ?? [],
      evidenceWeight: artifacts.length > 0 ? 1 / artifacts.length : 1,
      storagePath: artifact.storagePath,
    })),
    ensemble: score?.ensemble ?? [],
    committee_review: committeeReview,
    evaluation_session_id: session?.id,
    created_at: candidate.created_at,
    updated_at: session?.updatedAt ?? candidate.updated_at,
  };

  return enrichCandidate(base);
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
  const db = await readDb();
  const now = new Date().toISOString();
  const existingSession = db.sessions.find((item) => item.authSessionId === authSessionId);
  if (existingSession) {
    return {
      candidateId: existingSession.candidateId,
      sessionId: existingSession.id,
    };
  }

  const candidateId = `cand-${randomUUID().slice(0, 8)}`;
  const numeric = String(db.candidates.length + 2401).padStart(4, "0");
  const code = `IU-${numeric}`;
  const candidate: PersistedCandidate = {
    id: candidateId,
    code,
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
  };

  const session: PersistedEvaluationSession = {
    id: `eval-${randomUUID().slice(0, 10)}`,
    candidateId,
    authSessionId,
    messages: [],
    artifacts: [],
    progress: 12,
    status: "active",
    phase: "Foundation",
    scoreUpdate: null,
    createdAt: now,
    updatedAt: now,
  };

  db.candidates.push(candidate);
  db.sessions.push(session);
  await writeDb(db);

  return {
    candidateId,
    sessionId: session.id,
  };
}

export async function registerCommitteeMember({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const db = await readDb();
  const existing = db.committeeMembers.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return existing;
  }

  const member: PersistedCommitteeMember = {
    id: `cm-${randomUUID().slice(0, 8)}`,
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  db.committeeMembers.push(member);
  await writeDb(db);
  return member;
}

export async function resolveCommitteeMember(email?: string, name?: string) {
  if (!email) return null;
  const db = await readDb();
  let member = db.committeeMembers.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null;
  if (!member && name) {
    member = {
      id: `cm-${randomUUID().slice(0, 8)}`,
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    db.committeeMembers.push(member);
    await writeDb(db);
  }
  return member;
}

export async function getPersistedSessionByAuthSession(authSessionId: string) {
  const db = await readDb();
  return db.sessions.find((item) => item.authSessionId === authSessionId) ?? null;
}

export async function getOrCreatePersistedEvaluationSession(authSessionId: string, candidateName: string) {
  const db = await readDb();
  const session = db.sessions.find((item) => item.authSessionId === authSessionId) ?? null;
  if (session) return session;

  const { sessionId } = await registerCandidateProfile({
    authSessionId,
    name: candidateName,
  });
  const fresh = await readDb();
  return fresh.sessions.find((item) => item.id === sessionId)!;
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
  const db = await readDb();
  let session = db.sessions.find((item) => item.authSessionId === input.authSessionId);
  let candidate = session ? db.candidates.find((item) => item.id === session?.candidateId) : undefined;

  if (!session || !candidate) {
    const created = await registerCandidateProfile({
      authSessionId: input.authSessionId,
      name: input.candidateName,
    });
    const fresh = await readDb();
    session = fresh.sessions.find((item) => item.id === created.sessionId)!;
    candidate = fresh.candidates.find((item) => item.id === created.candidateId)!;
    db.candidates = fresh.candidates;
    db.sessions = fresh.sessions;
  }

  session.messages = input.messages;
  session.artifacts = input.artifacts;
  session.progress = input.progress;
  session.status = input.status;
  session.phase = input.phase;
  session.scoreUpdate = input.scoreUpdate;
  session.updatedAt = new Date().toISOString();

  const firstUserText = input.messages.find((item) => item.role === "user")?.content;
  const latestUserText = [...input.messages].reverse().find((item) => item.role === "user")?.content;
  candidate.name = input.candidateName || candidate.name;
  candidate.motivation_text = latestUserText || candidate.motivation_text;
  candidate.goals = latestUserText || candidate.goals;
  candidate.experience = firstUserText || candidate.experience;
  candidate.essay_excerpt = firstUserText || candidate.essay_excerpt;
  candidate.updated_at = session.updatedAt;

  await writeDb(db);
  return session;
}

export async function getPersistedCandidates(): Promise<Candidate[]> {
  const db = await readDb();
  return db.candidates.map((candidate) => {
    const session = db.sessions.find((item) => item.candidateId === candidate.id);
    const votes = db.votes.filter((item) => item.candidateId === candidate.id);
    return buildPersistedCandidateView(candidate, session, votes);
  });
}

export async function getPersistedCandidate(id: string): Promise<Candidate | null> {
  const db = await readDb();
  const candidate = db.candidates.find((item) => item.id === id);
  if (!candidate) return null;
  const session = db.sessions.find((item) => item.candidateId === candidate.id);
  const votes = db.votes.filter((item) => item.candidateId === candidate.id);
  return buildPersistedCandidateView(candidate, session, votes);
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
  const db = await readDb();
  const existingIndex = db.votes.findIndex(
    (item) => item.candidateId === input.candidateId && item.memberId === input.memberId,
  );

  const vote: PersistedCommitteeVote = {
    candidateId: input.candidateId,
    memberId: input.memberId,
    memberName: input.memberName,
    decision: input.decision,
    rationale: input.rationale,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    db.votes[existingIndex] = vote;
  } else {
    db.votes.push(vote);
  }

  await writeDb(db);
  return getPersistedCandidate(input.candidateId);
}

export async function persistUploadedArtifactMeta(attachment: ChatAttachment) {
  await ensureDataDir();
  return attachment;
}

export async function getUploadsDir() {
  await ensureDataDir();
  return UPLOADS_DIR;
}

export async function saveUploadedBinary(filename: string, bytes: Uint8Array, mimeType?: string) {
  await ensureDataDir();
  void mimeType;
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = path.join(UPLOADS_DIR, `${randomUUID()}-${safe}`);
  await writeFile(fullPath, bytes);
  return fullPath;
}
