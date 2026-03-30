import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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

export async function getAllCandidates(status?: string) {
  const where = status ? { status } : {};
  
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
    byStatus: byStatus.reduce((acc, s) => {
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
