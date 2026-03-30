import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getCandidateApplicationOverview } from "@/lib/server/account-store";
import {
  getAllCandidates,
  getAuthenticatedAccountByToken,
  submitCandidateApplication,
} from "@/lib/server/prisma";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";

const applicationSchema = z.object({
  // Personal info
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+7\d{10}$/, "Use Kazakhstan format: +7XXXXXXXXXX"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  city: z.string().min(2).max(50),
  
  // Education
  educationLevel: z.enum(["high_school", "bachelor", "master", "other"]),
  schoolName: z.string().min(2).max(100),
  graduationYear: z.number().min(2020).max(2030),
  
  // Formal achievements
  achievements: z.array(z.object({
    type: z.enum(["academic", "competition", "project", "certificate", "other"]),
    title: z.string().min(5).max(200),
    description: z.string().min(10).max(500),
    year: z.number().min(2015).max(2026),
  })).max(10),
  
  // Informal qualities
  motivation: z.object({
    whyVisionU: z.string().min(50).max(2000),
    goals: z.string().min(50).max(2000),
    changeAgentVision: z.string().min(50).max(2000),
  }),
  
  // Experience
  hasLeadershipExperience: z.boolean(),
  leadershipDescription: z.string().max(1000).optional(),
  hasTeamExperience: z.boolean(),
  teamExperienceDescription: z.string().max(1000).optional(),
  
  // Skills
  skills: z.array(z.string()).max(15),
  languages: z.array(z.object({
    language: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced", "native"]),
  })),
  
  // Portfolio
  portfolioLinks: z.array(z.object({
    type: z.enum(["github", "linkedin", "website", "other"]),
    url: z.string().url(),
    description: z.string().max(200).optional(),
  })).max(5),
  
  // Additional
  howDidYouHear: z.enum(["social_media", "friend", "school", "university", "other"]),
  agreeToTerms: z.literal(true),
});

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  // Only candidates can submit applications
  if (session.role !== "candidate") {
    return addSecurityHeaders(
      NextResponse.json({ error: "Only candidates can submit applications" }, { status: 403 }),
    );
  }

  try {
    const body = sanitizeObject(await request.json()) as Record<string, unknown>;
    const application = applicationSchema.parse(body);
    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);

    if (!persistedSession?.account.candidate?.id) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Candidate session is not linked to a profile" }, { status: 404 }),
      );
    }

    const completenessScore = calculateCompleteness(application);
    const formalScore = calculateFormalAchievementsScore(application);
    const informalScore = calculateInformalQualitiesScore(application);
    const overall = Math.round((completenessScore * 0.2 + formalScore * 0.3 + informalScore * 0.5) * 10) / 10;

    const candidate = await submitCandidateApplication({
      candidateId: persistedSession.account.candidate.id,
      actorId: persistedSession.account.id,
      actorName: persistedSession.account.name,
      actorRole: "candidate",
      payload: application,
      scores: {
        completeness: completenessScore,
        formalAchievements: formalScore,
        informalQualities: informalScore,
        overall,
      },
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        candidateId: candidate.id,
        code: candidate.code,
        scores: {
          completeness: completenessScore,
          formalAchievements: formalScore,
          informalQualities: informalScore,
          overall,
        },
        nextStep: "interview_scheduled",
        message: "Application submitted successfully. The interview and committee review remain in a human-supervised flow.",
      }),
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        ),
      );
    }
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to submit application" },
        { status: 500 }
      ),
    );
  }
}

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    if (session.role === "candidate") {
      if (!session.entityId) {
        return addSecurityHeaders(NextResponse.json({ error: "Application not found" }, { status: 404 }));
      }
      const overview = await getCandidateApplicationOverview(session.entityId);
      if (!overview) {
        return addSecurityHeaders(NextResponse.json({ error: "Application not found" }, { status: 404 }));
      }

      return addSecurityHeaders(
        NextResponse.json({
          candidate: {
            id: overview.candidate.id,
            code: overview.candidate.code,
            status: overview.candidate.status,
            applicationCompleted: overview.application.applicationCompleted,
            submittedAt: overview.application.applicationSubmittedAt,
          },
          canEdit: overview.candidate.status === "in_progress",
        }),
      );
    }

    if (session.role === "committee") {
      const candidates = await getAllCandidates();
      const applications = await Promise.all(
        candidates.map(async (candidate) => {
          const overview = await getCandidateApplicationOverview(candidate.id);
          return {
            id: candidate.id,
            code: candidate.code,
            name: candidate.fullName,
            email: candidate.email,
            city: candidate.city,
            status: candidate.status,
            educationLevel: overview?.application.educationLevel,
            skills: overview?.application.skills || [],
            achievements: overview?.application.achievements.length || 0,
            submittedAt: overview?.application.applicationSubmittedAt,
          };
        }),
      );

      return addSecurityHeaders(NextResponse.json({ applications, count: applications.length }));
    }

  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch application" },
        { status: 500 }
      ),
    );
  }
}

function calculateCompleteness(app: z.infer<typeof applicationSchema>): number {
  let score = 0;
  let max = 100;
  
  // Personal info (20 points)
  score += 20;
  
  // Education (15 points)
  score += 15;
  
  // Achievements (20 points)
  score += Math.min(20, app.achievements.length * 4);
  
  // Motivation (25 points)
  const motivationLength = app.motivation.whyVisionU.length + app.motivation.goals.length + app.motivation.changeAgentVision.length;
  score += Math.min(25, motivationLength / 20);
  
  // Experience (10 points)
  if (app.hasLeadershipExperience && app.leadershipDescription) score += 5;
  if (app.hasTeamExperience && app.teamExperienceDescription) score += 5;
  
  // Skills (5 points)
  score += Math.min(5, app.skills.length);
  
  // Portfolio (5 points)
  score += Math.min(5, app.portfolioLinks.length * 2);
  
  return Math.min(100, Math.round(score));
}

function calculateFormalAchievementsScore(app: z.infer<typeof applicationSchema>): number {
  let score = 50; // Base score
  
  // Education level
  const eduWeights = { high_school: 0, bachelor: 5, master: 10, other: 2 };
  score += eduWeights[app.educationLevel];
  
  // Achievements weight
  const achievementWeights = {
    academic: 5,
    competition: 7,
    project: 6,
    certificate: 3,
    other: 2,
  };
  
  app.achievements.forEach(ach => {
    score += achievementWeights[ach.type];
  });
  
  // Portfolio quality
  app.portfolioLinks.forEach(link => {
    if (link.type === "github") score += 3;
    if (link.type === "linkedin") score += 2;
    if (link.type === "website") score += 2;
  });
  
  return Math.min(100, Math.round(score));
}

function calculateInformalQualitiesScore(app: z.infer<typeof applicationSchema>): number {
  let score = 40; // Base score
  
  // Motivation depth
  const whyLength = app.motivation.whyVisionU.length;
  const goalsLength = app.motivation.goals.length;
  const visionLength = app.motivation.changeAgentVision.length;
  
  score += Math.min(15, whyLength / 20);
  score += Math.min(15, goalsLength / 20);
  score += Math.min(15, visionLength / 20);
  
  // Leadership mindset
  if (app.hasLeadershipExperience) score += 5;
  if (app.leadershipDescription && app.leadershipDescription.length > 100) score += 5;
  
  // Team orientation
  if (app.hasTeamExperience) score += 5;
  
  // Skill diversity
  score += Math.min(10, app.skills.length * 2);
  
  // Language skills
  const langLevels = { beginner: 1, intermediate: 2, advanced: 3, native: 4 };
  const langScore = app.languages.reduce((sum, l) => sum + langLevels[l.level], 0);
  score += Math.min(10, langScore * 2);
  
  return Math.min(100, Math.round(score));
}
