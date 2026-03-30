import { randomUUID } from "crypto";
import { PrismaClient, VoteDecision } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type CandidateApplicationInput = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  educationLevel: "high_school" | "bachelor" | "master" | "other";
  schoolName: string;
  graduationYear: number;
  achievements: Array<{
    type: "academic" | "competition" | "project" | "certificate" | "other";
    title: string;
    description: string;
    year: number;
  }>;
  motivation: {
    whyVisionU: string;
    goals: string;
    changeAgentVision: string;
  };
  hasLeadershipExperience: boolean;
  leadershipDescription?: string;
  hasTeamExperience: boolean;
  teamExperienceDescription?: string;
  skills: string[];
  languages: Array<{
    language: string;
    level: "beginner" | "intermediate" | "advanced" | "native";
  }>;
  portfolioLinks: Array<{
    type: "github" | "linkedin" | "website" | "other";
    url: string;
    description?: string;
  }>;
  howDidYouHear: "social_media" | "friend" | "school" | "university" | "other";
  agreeToTerms: true;
};

// ============================================================================
// CANDIDATE OPERATIONS
// ============================================================================

export async function getCandidateById(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      interviewSession: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      resume: true,
      artifacts: true,
      evaluations: {
        orderBy: { createdAt: 'desc' },
      },
      committeeVotes: {
        include: {
          committee: true,
        },
      },
      liveInterviews: true,
      account: {
        select: {
          email: true,
          phone: true,
        },
      },
    },
  });
}

export async function getCandidateByAccountId(accountId: string) {
  return prisma.candidate.findUnique({
    where: { accountId },
    include: {
      interviewSession: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      resume: true,
      artifacts: true,
      evaluations: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function getAllCandidates(status?: 'in_progress' | 'completed' | 'shortlisted' | 'rejected' | 'flagged' | 'accepted' | 'withdrawn') {
  const where = status ? { status: status as any } : {};
  
  return prisma.candidate.findMany({
    where,
    include: {
      interviewSession: {
        select: {
          progress: true,
          status: true,
        },
      },
      evaluations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          committeeVotes: true,
          artifacts: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createCandidate(data: {
  accountId: string;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  const count = await prisma.candidate.count();
  const code = `IU-${String(count + 2401).padStart(4, '0')}`;
  
  return prisma.candidate.create({
    data: {
      code,
      accountId: data.accountId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      city: 'Unspecified',
      goals: 'To be collected during the interview.',
      experience: 'To be collected during the interview.',
      motivationText: 'To be collected during the interview.',
      interviewSession: {
        create: {
          progress: 12,
          phase: 'Foundation',
          status: 'active',
        },
      },
    },
    include: {
      interviewSession: true,
    },
  });
}

export async function updateCandidate(id: string, data: any) {
  return prisma.candidate.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function createCandidateAccountWithSession(data: {
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
}) {
  const email = data.email?.trim().toLowerCase() || undefined;
  const phone = data.phone.trim();

  const existing = await prisma.account.findFirst({
    where: {
      OR: [{ phone }, ...(email ? [{ email }] : [])],
    },
  });

  if (existing) {
    throw new Error("Candidate account already exists");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  return prisma.$transaction(async (tx) => {
    const count = await tx.candidate.count();
    const account = await tx.account.create({
      data: {
        role: "candidate",
        name: data.name.trim(),
        email,
        phone,
        passwordHash: data.passwordHash,
      },
    });

    const candidate = await tx.candidate.create({
      data: {
        code: `IU-${String(count + 2401).padStart(4, "0")}`,
        accountId: account.id,
        fullName: data.name.trim(),
        email,
        phone,
        status: "in_progress",
        city: "Unspecified",
        goals: "To be collected during the interview.",
        experience: "To be collected during the interview.",
        motivationText: "To be collected during the interview.",
        interviewSession: {
          create: {
            progress: 12,
            phase: "Foundation",
            status: "active",
          },
        },
      },
    });

    const session = await tx.session.create({
      data: {
        accountId: account.id,
        token,
        expiresAt,
      },
    });

    return { account, candidate, session };
  });
}

export async function createCommitteeAccountWithSession(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.account.findFirst({
    where: {
      OR: [{ email }, { committeeMember: { email } }],
    },
  });

  if (existing) {
    throw new Error("Committee account already exists");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        role: "committee",
        name: data.name.trim(),
        email,
        passwordHash: data.passwordHash,
      },
    });

    const committeeMember = await tx.committeeMember.create({
      data: {
        accountId: account.id,
        name: data.name.trim(),
        email,
      },
    });

    const session = await tx.session.create({
      data: {
        accountId: account.id,
        token,
        expiresAt,
      },
    });

    return { account, committeeMember, session };
  });
}

export async function createAccountSession(accountId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  return createSession(accountId, token, expiresAt);
}

export async function getAccountByIdentifier(role: "candidate" | "committee" | "admin", identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return prisma.account.findFirst({
    where: {
      role,
      OR: [{ email: normalized }, { phone: identifier.trim() }],
    },
    include: {
      candidate: true,
      committeeMember: true,
    },
  });
}

export async function getAuthenticatedAccountByToken(token: string) {
  const session = await getSessionByToken(token);
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return session;
}

export async function getCandidateApplicationRecord(candidateId: string) {
  const [candidate, latestApplicationAudit, votes] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        skills: true,
        resume: true,
        evaluations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        entityType: "candidate_application",
        entityId: candidateId,
        action: "APPLICATION_SUBMITTED",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.committeeVote.findMany({
      where: { candidateId },
      include: {
        committee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!candidate) {
    return null;
  }

  const snapshot = (latestApplicationAudit?.details ?? {}) as Record<string, any>;
  const latestEvaluation = candidate.evaluations[0];

  return {
    candidate,
    application: {
      dateOfBirth: candidate.dateOfBirth?.toISOString().slice(0, 10),
      educationLevel: candidate.educationLevel,
      schoolName: candidate.institution,
      graduationYear: candidate.graduationYear,
      achievements: Array.isArray(snapshot.achievements) ? snapshot.achievements : [],
      motivation: {
        whyVisionU: candidate.whyInVision,
        goals: candidate.goals,
        changeAgentVision: candidate.changeAgentVision,
      },
      hasLeadershipExperience: Boolean(candidate.leadershipDesc),
      leadershipDescription: candidate.leadershipDesc,
      hasTeamExperience: Boolean(candidate.teamworkDesc),
      teamExperienceDescription: candidate.teamworkDesc,
      skills: candidate.skills.map((skill) => skill.skill),
      languages: Array.isArray(snapshot.languages) ? snapshot.languages : [],
      portfolioLinks: Array.isArray(snapshot.portfolioLinks) ? snapshot.portfolioLinks : [],
      howDidYouHear: snapshot.howDidYouHear,
      applicationCompleted: snapshot.applicationCompleted ?? candidate.status !== "in_progress",
      applicationSubmittedAt: latestApplicationAudit?.createdAt?.toISOString(),
      applicationScores: snapshot.applicationScores ?? null,
      consent: {
        agreeToTerms: candidate.dataProcessingConsent || snapshot.agreeToTerms || false,
        consentCapturedAt: candidate.consentAcceptedAt?.toISOString() ?? latestApplicationAudit?.createdAt?.toISOString(),
        privacyAcceptedAt: candidate.privacyPolicyAcceptedAt?.toISOString(),
      },
    },
    resumeUrl: candidate.resume?.fileUrl,
    committeeVotes: votes,
    latestEvaluation,
  };
}

export async function submitCandidateApplication(params: {
  candidateId: string;
  actorId: string;
  actorName: string;
  actorRole: "candidate" | "committee" | "admin";
  payload: CandidateApplicationInput;
  scores: {
    completeness: number;
    formalAchievements: number;
    informalQualities: number;
    overall: number;
  };
  ipAddress?: string;
  userAgent?: string;
}) {
  const application = params.payload;

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.update({
      where: { id: params.candidateId },
      data: {
        fullName: application.fullName,
        email: application.email.toLowerCase(),
        phone: application.phone,
        dateOfBirth: new Date(application.dateOfBirth),
        city: application.city,
        educationLevel: application.educationLevel,
        institution: application.schoolName,
        graduationYear: application.graduationYear,
        goals: application.motivation.goals,
        motivationText: application.motivation.whyVisionU,
        whyInVision: application.motivation.whyVisionU,
        changeAgentVision: application.motivation.changeAgentVision,
        leadershipDesc: application.hasLeadershipExperience ? application.leadershipDescription : null,
        teamworkDesc: application.hasTeamExperience ? application.teamExperienceDescription : null,
        experience:
          application.leadershipDescription ||
          application.teamExperienceDescription ||
          "Experience provided in structured application.",
        dataProcessingConsent: true,
        consentAcceptedAt: new Date(),
        privacyPolicyAcceptedAt: new Date(),
        status: "completed",
        overallScore: params.scores.overall,
      },
    });

    await tx.candidateSkill.deleteMany({
      where: { candidateId: params.candidateId },
    });

    const uniqueSkills = [...new Set(application.skills.map((skill) => skill.trim()).filter(Boolean))];
    if (uniqueSkills.length > 0) {
      await tx.candidateSkill.createMany({
        data: uniqueSkills.map((skill) => ({
          candidateId: params.candidateId,
          skill,
          source: "self_reported",
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        action: "APPLICATION_SUBMITTED",
        entityType: "candidate_application",
        entityId: params.candidateId,
        actorId: params.actorId,
        actorType: params.actorRole,
        actorName: params.actorName,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: {
          achievements: application.achievements,
          languages: application.languages,
          portfolioLinks: application.portfolioLinks,
          howDidYouHear: application.howDidYouHear,
          agreeToTerms: application.agreeToTerms,
          applicationCompleted: true,
          applicationScores: params.scores,
        },
      },
    });

    return candidate;
  });
}

export async function resolveCandidateStatusFromVotes(candidateId: string) {
  const [votes, committeeCount] = await Promise.all([
    prisma.committeeVote.findMany({
      where: { candidateId },
    }),
    prisma.committeeMember.count(),
  ]);

  const approvals = votes.filter((vote) => vote.decision === "approved").length;
  const rejects = votes.filter((vote) => vote.decision === "rejected").length;
  const holds = votes.filter((vote) => vote.decision === "hold").length;

  const approvalThreshold = Math.max(3, Math.min(committeeCount || 3, 3));

  let status: "completed" | "shortlisted" | "rejected" | "flagged" = "completed";

  if (approvals >= approvalThreshold) {
    status = "shortlisted";
  } else if (rejects >= approvalThreshold) {
    status = "rejected";
  } else if (holds > 0 || rejects > 0) {
    status = "flagged";
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status },
  });

  return {
    status,
    approvals,
    rejects,
    holds,
    threshold: approvalThreshold,
  };
}

export async function recordCommitteeDecision(data: {
  candidateId: string;
  committeeId: string;
  actorId: string;
  actorName: string;
  decision: "approved" | "hold" | "rejected";
  formalScore?: number;
  informalScore?: number;
  notes?: string;
  recommendation?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const vote = await createCommitteeVote({
    candidateId: data.candidateId,
    committeeId: data.committeeId,
    decision: data.decision,
    formalScore: data.formalScore,
    informalScore: data.informalScore,
    notes: data.notes,
    recommendation: data.recommendation,
  });

  const resolution = await resolveCandidateStatusFromVotes(data.candidateId);

  await createAuditLog({
    action: "COMMITTEE_VOTE_RECORDED",
    entityType: "committee_vote",
    entityId: vote.id,
    actorId: data.actorId,
    actorType: "committee",
    actorName: data.actorName,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: {
      candidateId: data.candidateId,
      committeeId: data.committeeId,
      decision: data.decision,
      formalScore: data.formalScore,
      informalScore: data.informalScore,
      recommendation: data.recommendation,
      resolution,
    },
  });

  return { vote, resolution };
}

// ============================================================================
// INTERVIEW SESSION OPERATIONS
// ============================================================================

export async function getInterviewSessionByCandidateId(candidateId: string) {
  return prisma.interviewSession.findUnique({
    where: { candidateId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function addInterviewMessage(data: {
  sessionId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  type?: 'text' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  scoreUpdate?: any;
}) {
  return prisma.interviewMessage.create({
    data: {
      sessionId: data.sessionId,
      role: data.role,
      content: data.content,
      type: data.type || 'text',
      mediaUrl: data.mediaUrl,
      scoreUpdate: data.scoreUpdate,
    },
  });
}

export async function updateInterviewProgress(
  sessionId: string,
  progress: number,
  phase?: string,
  scores?: any
) {
  return prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      progress,
      phase: phase || undefined,
      ...scores,
      updatedAt: new Date(),
    },
  });
}

// ============================================================================
// ARTIFACT OPERATIONS
// ============================================================================

export async function createArtifact(data: {
  candidateId: string;
  type: 'resume' | 'video' | 'audio' | 'document' | 'image' | 'portfolio';
  name: string;
  url: string;
  size: number;
  mimeType?: string;
  analysis?: any;
}) {
  return prisma.artifact.create({
    data: {
      candidateId: data.candidateId,
      type: data.type,
      name: data.name,
      url: data.url,
      size: data.size,
      mimeType: data.mimeType,
      analysis: data.analysis,
    },
  });
}

export async function updateArtifactAnalysis(id: string, analysis: any) {
  return prisma.artifact.update({
    where: { id },
    data: { analysis },
  });
}

// ============================================================================
// RESUME OPERATIONS
// ============================================================================

export async function createResume(data: {
  candidateId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  keywords?: string[];
}) {
  // Delete existing resume if any
  await prisma.resume.deleteMany({
    where: { candidateId: data.candidateId },
  });
  
  return prisma.resume.create({
    data: {
      candidateId: data.candidateId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      extractedText: data.extractedText,
      keywords: data.keywords || [],
    },
  });
}

export async function createLiveInterviewRecord(data: {
  candidateId: string;
  sessionId: string;
  type: string;
  status?: string;
  videoAnalysis?: object | null;
  voiceAnalysis?: object | null;
  combinedScore?: number | null;
  keyMoments?: object | null;
  confidence?: number | null;
  stressLevel?: number | null;
  authenticity?: number | null;
  recommendation?: string | null;
}) {
  return prisma.liveInterview.upsert({
    where: { sessionId: data.sessionId },
    update: {
      type: data.type,
      status: data.status ?? "completed",
      videoAnalysis: data.videoAnalysis ?? undefined,
      voiceAnalysis: data.voiceAnalysis ?? undefined,
      combinedScore: data.combinedScore ?? undefined,
      keyMoments: data.keyMoments ?? undefined,
      confidence: data.confidence ?? undefined,
      stressLevel: data.stressLevel ?? undefined,
      authenticity: data.authenticity ?? undefined,
      recommendation: data.recommendation ?? undefined,
      completedAt: new Date(),
    },
    create: {
      candidateId: data.candidateId,
      sessionId: data.sessionId,
      type: data.type,
      status: data.status ?? "completed",
      videoAnalysis: data.videoAnalysis ?? undefined,
      voiceAnalysis: data.voiceAnalysis ?? undefined,
      combinedScore: data.combinedScore ?? undefined,
      keyMoments: data.keyMoments ?? undefined,
      confidence: data.confidence ?? undefined,
      stressLevel: data.stressLevel ?? undefined,
      authenticity: data.authenticity ?? undefined,
      recommendation: data.recommendation ?? undefined,
      completedAt: new Date(),
    },
  });
}

// ============================================================================
// EVALUATION OPERATIONS
// ============================================================================

export async function createEvaluation(data: {
  candidateId: string;
  hardSkills?: number;
  softSkills?: number;
  problemSolving?: number;
  communication?: number;
  adaptability?: number;
  leadershipPotential?: number;
  changeAgentMindset?: number;
  authenticity?: number;
  overallScore?: number;
  confidence?: number;
  strengths?: any;
  weaknesses?: any;
  redFlags?: any;
  recommendation?: string;
  reasoning?: string;
  evaluatorType?: string;
  evaluatorId?: string;
}) {
  return prisma.candidateEvaluation.create({
    data: {
      candidateId: data.candidateId,
      hardSkills: data.hardSkills,
      softSkills: data.softSkills,
      problemSolving: data.problemSolving,
      communication: data.communication,
      adaptability: data.adaptability,
      leadershipPotential: data.leadershipPotential,
      changeAgentMindset: data.changeAgentMindset,
      authenticity: data.authenticity,
      overallScore: data.overallScore,
      confidence: data.confidence,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      redFlags: data.redFlags,
      recommendation: data.recommendation,
      reasoning: data.reasoning,
      evaluatorType: data.evaluatorType || 'ai',
      evaluatorId: data.evaluatorId,
    },
  });
}

// ============================================================================
// COMMITTEE OPERATIONS
// ============================================================================

export async function getCommitteeMemberByAccountId(accountId: string) {
  return prisma.committeeMember.findUnique({
    where: { accountId },
  });
}

export async function getAllCommitteeMembers() {
  return prisma.committeeMember.findMany({
    include: {
      _count: {
        select: {
          votes: true,
        },
      },
    },
  });
}

export async function createCommitteeVote(data: {
  candidateId: string;
  committeeId: string;
  decision: 'pending' | 'approved' | 'hold' | 'rejected';
  formalScore?: number;
  informalScore?: number;
  notes?: string;
  recommendation?: string;
}) {
  return prisma.committeeVote.upsert({
    where: {
      candidateId_committeeId: {
        candidateId: data.candidateId,
        committeeId: data.committeeId,
      },
    },
    update: {
      decision: data.decision,
      formalScore: data.formalScore,
      informalScore: data.informalScore,
      notes: data.notes,
      recommendation: data.recommendation,
      updatedAt: new Date(),
    },
    create: {
      candidateId: data.candidateId,
      committeeId: data.committeeId,
      decision: data.decision,
      formalScore: data.formalScore,
      informalScore: data.informalScore,
      notes: data.notes,
      recommendation: data.recommendation,
    },
  });
}

export async function getCandidateVotes(candidateId: string) {
  return prisma.committeeVote.findMany({
    where: { candidateId },
    include: {
      committee: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

// ============================================================================
// ACCOUNT & AUTH OPERATIONS
// ============================================================================

export async function getAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
    include: {
      candidate: true,
      committeeMember: true,
    },
  });
}

export async function getAccountByEmail(email: string) {
  return prisma.account.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      candidate: true,
      committeeMember: true,
    },
  });
}

export async function getAccountByPhone(phone: string) {
  return prisma.account.findUnique({
    where: { phone },
    include: {
      candidate: true,
    },
  });
}

export async function createAccount(data: {
  role: 'candidate' | 'committee' | 'admin';
  email?: string;
  phone?: string;
  passwordHash: string;
  name: string;
}) {
  return prisma.account.create({
    data: {
      role: data.role,
      email: data.email?.toLowerCase(),
      phone: data.phone,
      passwordHash: data.passwordHash,
      name: data.name,
    },
  });
}

export async function createSession(accountId: string, token: string, expiresAt: Date) {
  return prisma.session.create({
    data: {
      accountId,
      token,
      expiresAt,
    },
  });
}

export async function getSessionByToken(token: string) {
  return prisma.session.findUnique({
    where: { token },
    include: {
      account: {
        include: {
          candidate: true,
          committeeMember: true,
        },
      },
    },
  });
}

export async function deleteSession(token: string) {
  return prisma.session.delete({
    where: { token },
  });
}

export async function deleteExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

// ============================================================================
// ANALYTICS OPERATIONS
// ============================================================================

export async function getCandidateStats() {
  const [
    total,
    byStatus,
    shortlisted,
    rejected,
    withScores,
    avgScore,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.candidate.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.candidate.count({ where: { status: 'shortlisted' } }),
    prisma.candidate.count({ where: { status: 'rejected' } }),
    prisma.candidate.count({ where: { overallScore: { not: null } } }),
    prisma.candidate.aggregate({
      _avg: { overallScore: true },
      where: { overallScore: { not: null } },
    }),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc: Record<string, number>, s: { status: string; _count: { id: number } }) => {
      acc[s.status] = s._count.id;
      return acc;
    }, {} as Record<string, number>),
    shortlisted,
    rejected,
    withScores,
    averageScore: avgScore._avg.overallScore || 0,
  };
}

export async function getCommitteeStats() {
  return prisma.committeeMember.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          votes: true,
        },
      },
      votes: {
        select: {
          decision: true,
        },
      },
    },
  });
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

export async function createAuditLog(data: {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorType: string;
  actorName?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      actorId: data.actorId,
      actorType: data.actorType,
      actorName: data.actorName,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

export async function getAuditLogs(entityType?: string, entityId?: string) {
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
