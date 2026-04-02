import {
  createAccountSession,
  createCandidateAccountWithSession,
  createCommitteeAccountWithSession,
  getAccountByIdentifier,
  getAuthenticatedAccountByToken,
  getCandidateApplicationRecord,
  getCandidateByAccountId,
  getCandidateStats,
  getCommitteeStats,
} from "@/lib/server/prisma";

function logAccountStoreError(scope: string, error: unknown) {
  console.error(`[account-store] ${scope} failed`, error);
}

export type AuthAccount = {
  id: string;
  role: "candidate" | "committee" | "admin" | "viewer";
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  entityId: string;
  createdAt: string;
  updatedAt: string;
};

type CandidateOverview = {
  account: AuthAccount;
  candidate: {
    id: string;
    code: string;
    status: string;
    goals: string;
    experience: string;
    final_score: number;
    applicationCompleted: boolean;
  };
  session: {
    progress: number;
    phase: string;
  } | null;
};

type CommitteeOverview = {
  account: AuthAccount;
  assignedVotes: number;
  approvedVotes: number;
  pendingCases: number;
};

type AdminOverview = {
  account: AuthAccount;
  totalCandidates: number;
  shortlisted: number;
  flagged: number;
};

type ViewerOverview = {
  account: AuthAccount;
  totalCandidates: number;
  shortlisted: number;
  averageScore: number;
};

function mapAccount(account: Awaited<ReturnType<typeof getAccountByIdentifier>>) {
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    role: account.role as "candidate" | "committee" | "admin" | "viewer",
    name: account.name,
    email: account.email ?? undefined,
    phone: account.phone ?? undefined,
    passwordHash: account.passwordHash,
    entityId: account.candidate?.id ?? account.committeeMember?.id ?? account.id,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  } satisfies AuthAccount;
}

export async function findAccountForLogin(role: "candidate" | "committee" | "admin" | "viewer", identifier: string) {
  try {
    return mapAccount(await getAccountByIdentifier(role, identifier));
  } catch (error) {
    logAccountStoreError("findAccountForLogin", error);
    return null;
  }
}

export async function findAccountBySessionToken(token: string) {
  try {
    const session = await getAuthenticatedAccountByToken(token);
    if (!session) {
      return null;
    }

    return mapAccount({
      ...session.account,
      candidate: session.account.candidate,
      committeeMember: session.account.committeeMember,
    });
  } catch (error) {
    logAccountStoreError("findAccountBySessionToken", error);
    return null;
  }
}

export async function registerCandidateAccount(input: {
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
}) {
  const result = await createCandidateAccountWithSession(input);

  return {
    id: result.session.token,
    role: "candidate" as const,
    name: result.account.name,
    email: result.account.email ?? undefined,
    phone: result.account.phone ?? undefined,
    passwordHash: result.account.passwordHash,
    entityId: result.candidate.id,
    createdAt: result.account.createdAt.toISOString(),
    updatedAt: result.account.updatedAt.toISOString(),
  };
}

export async function registerCommitteeAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const result = await createCommitteeAccountWithSession(input);

  return {
    id: result.session.token,
    role: "committee" as const,
    name: result.account.name,
    email: result.account.email ?? undefined,
    phone: undefined,
    passwordHash: result.account.passwordHash,
    entityId: result.committeeMember.id,
    createdAt: result.account.createdAt.toISOString(),
    updatedAt: result.account.updatedAt.toISOString(),
  };
}

export async function createLoginSession(accountId: string) {
  return createAccountSession(accountId);
}

export async function getCandidateAccountOverview(sessionToken: string): Promise<CandidateOverview | null> {
  try {
    const session = await getAuthenticatedAccountByToken(sessionToken);
    if (!session || session.account.role !== "candidate") {
      return null;
    }

    const candidate = await getCandidateByAccountId(session.account.id);

    if (!candidate) {
      return null;
    }

    // Determine if application form was submitted (has motivation text or evaluations)
    const applicationCompleted = Boolean(
      candidate.whyInVision || candidate.goals || candidate.evaluations?.length > 0
    );

    return {
      account: {
        id: session.account.id,
        role: "candidate",
        name: session.account.name,
        email: session.account.email ?? undefined,
        phone: session.account.phone ?? undefined,
        passwordHash: session.account.passwordHash,
        entityId: candidate.id,
        createdAt: session.account.createdAt.toISOString(),
        updatedAt: session.account.updatedAt.toISOString(),
      },
      candidate: {
        id: candidate.id,
        code: candidate.code,
        status: candidate.status,
        goals: candidate.goals ?? "",
        experience: candidate.experience ?? "",
        final_score: candidate.overallScore ?? 0,
        applicationCompleted,
      },
      session: candidate.interviewSession
        ? {
            progress: candidate.interviewSession.progress,
            phase: candidate.interviewSession.phase,
          }
        : null,
    };
  } catch (error) {
    logAccountStoreError("getCandidateAccountOverview", error);
    return null;
  }
}

export async function getCommitteeAccountOverview(sessionToken: string): Promise<CommitteeOverview | null> {
  try {
    const session = await getAuthenticatedAccountByToken(sessionToken);
    if (!session || session.account.role !== "committee" || !session.account.committeeMember) {
      return null;
    }

    const committeeStats = await getCommitteeStats();
    const current = committeeStats.find((member) => member.id === session.account.committeeMember?.id);

    return {
      account: {
        id: session.account.id,
        role: "committee",
        name: session.account.name,
        email: session.account.email ?? undefined,
        phone: session.account.phone ?? undefined,
        passwordHash: session.account.passwordHash,
        entityId: session.account.committeeMember.id,
        createdAt: session.account.createdAt.toISOString(),
        updatedAt: session.account.updatedAt.toISOString(),
      },
      assignedVotes: current?._count.votes ?? 0,
      approvedVotes: current?.votes.filter((vote) => vote.decision === "approved").length ?? 0,
      pendingCases: 0,
    };
  } catch (error) {
    logAccountStoreError("getCommitteeAccountOverview", error);
    return null;
  }
}

export async function getAdminAccountOverview(sessionToken: string): Promise<AdminOverview | null> {
  try {
    const session = await getAuthenticatedAccountByToken(sessionToken);
    if (!session || session.account.role !== "admin") {
      return null;
    }

    const stats = await getCandidateStats();

    return {
      account: {
        id: session.account.id,
        role: "admin",
        name: session.account.name,
        email: session.account.email ?? undefined,
        phone: session.account.phone ?? undefined,
        passwordHash: session.account.passwordHash,
        entityId: session.account.id,
        createdAt: session.account.createdAt.toISOString(),
        updatedAt: session.account.updatedAt.toISOString(),
      },
      totalCandidates: stats.total,
      shortlisted: stats.shortlisted,
      flagged: stats.byStatus.flagged || 0,
    };
  } catch (error) {
    logAccountStoreError("getAdminAccountOverview", error);
    return null;
  }
}

export async function getViewerAccountOverview(sessionToken: string): Promise<ViewerOverview | null> {
  try {
    const session = await getAuthenticatedAccountByToken(sessionToken);
    if (!session || session.account.role !== "viewer") {
      return null;
    }

    const stats = await getCandidateStats();

    return {
      account: {
        id: session.account.id,
        role: "viewer",
        name: session.account.name,
        email: session.account.email ?? undefined,
        phone: session.account.phone ?? undefined,
        passwordHash: session.account.passwordHash,
        entityId: session.account.id,
        createdAt: session.account.createdAt.toISOString(),
        updatedAt: session.account.updatedAt.toISOString(),
      },
      totalCandidates: stats.total,
      shortlisted: stats.shortlisted,
      averageScore: Math.round((stats.averageScore || 0) * 10) / 10,
    };
  } catch (error) {
    logAccountStoreError("getViewerAccountOverview", error);
    return null;
  }
}

export async function getCandidateApplicationOverview(candidateId: string) {
  try {
    const record = await getCandidateApplicationRecord(candidateId);
    if (!record) {
      return null;
    }

    return {
      candidate: record.candidate,
      application: record.application,
      resumeUrl: record.resumeUrl,
      committeeVotes: record.committeeVotes,
      latestEvaluation: record.latestEvaluation,
    };
  } catch (error) {
    logAccountStoreError("getCandidateApplicationOverview", error);
    return null;
  }
}
