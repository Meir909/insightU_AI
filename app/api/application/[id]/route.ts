import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getCandidateApplicationOverview } from "@/lib/server/account-store";
import {
  getAuthenticatedAccountByToken,
  getCommitteeMemberByAccountId,
  recordCommitteeDecision,
} from "@/lib/server/prisma";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await params;

  try {
    const overview = await getCandidateApplicationOverview(id);
    
    if (!overview) {
      return addSecurityHeaders(NextResponse.json({ error: "Application not found" }, { status: 404 }));
    }

    if (session.role === "candidate" && session.entityId !== id) {
      return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const baseInfo = {
      id: overview.candidate.id,
      code: overview.candidate.code,
      name: overview.candidate.fullName,
      email: overview.candidate.email,
      phone: overview.candidate.phone,
      city: overview.candidate.city,
      status: overview.candidate.status,
      educationLevel: overview.application.educationLevel,
      schoolName: overview.application.schoolName,
      graduationYear: overview.application.graduationYear,
      applicationCompleted: overview.application.applicationCompleted,
      applicationSubmittedAt: overview.application.applicationSubmittedAt,
    };

    if (session.role === "committee") {
      return addSecurityHeaders(NextResponse.json({
        ...baseInfo,
        dateOfBirth: overview.application.dateOfBirth,
        achievements: overview.application.achievements,
        resumeUrl: overview.resumeUrl,
        motivation: overview.application.motivation,
        hasLeadershipExperience: overview.application.hasLeadershipExperience,
        leadershipDescription: overview.application.leadershipDescription,
        hasTeamExperience: overview.application.hasTeamExperience,
        teamExperienceDescription: overview.application.teamExperienceDescription,
        experience: overview.candidate.experience,
        skills: overview.application.skills,
        languages: overview.application.languages,
        portfolioLinks: overview.application.portfolioLinks,
        applicationScores: overview.application.applicationScores,
        committeeReview: overview.committeeVotes,
        canReview: true,
      }));
    }

    return addSecurityHeaders(NextResponse.json({
      ...baseInfo,
      scores: overview.application.applicationScores,
      nextSteps: getNextSteps({
        ...overview.candidate,
        applicationCompleted: overview.application.applicationCompleted,
        resumeUrl: overview.resumeUrl,
        committeeReview: overview.committeeVotes[0],
      }),
    }));

  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch application" },
        { status: 500 }
      ),
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  if (session.role !== "committee") {
    return addSecurityHeaders(
      NextResponse.json({ error: "Only committee can review applications" }, { status: 403 }),
    );
  }

  const { id } = await params;

  const reviewSchema = z.object({
    formalScore: z.number().min(0).max(100),
    informalScore: z.number().min(0).max(100),
    notes: z.string().max(2000),
    recommendation: z.enum(["proceed", "hold", "reject"]),
  });

  try {
    const review = reviewSchema.parse(sanitizeObject(await request.json()));
    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    if (!persistedSession?.account.id) {
      return addSecurityHeaders(NextResponse.json({ error: "Session not found" }, { status: 401 }));
    }

    const committeeMember = await getCommitteeMemberByAccountId(persistedSession.account.id);
    if (!committeeMember) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Committee member profile not found" }, { status: 404 }),
      );
    }

    const decision = review.recommendation === "proceed" ? "approved" : review.recommendation === "reject" ? "rejected" : "hold";
    const result = await recordCommitteeDecision({
      candidateId: id,
      committeeId: committeeMember.id,
      actorId: persistedSession.account.id,
      actorName: persistedSession.account.name,
      decision,
      formalScore: review.formalScore,
      informalScore: review.informalScore,
      notes: review.notes,
      recommendation: review.recommendation,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return addSecurityHeaders(NextResponse.json({
      success: true,
      message: `Review saved. Current candidate status: ${result.resolution.status}.`,
      recommendation: review.recommendation,
      resolution: result.resolution,
    }));

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
        { error: error instanceof Error ? error.message : "Failed to submit review" },
        { status: 500 }
      ),
    );
  }
}

function getNextSteps(candidate: {
  applicationCompleted?: unknown;
  resumeUrl?: unknown;
  committeeReview?: { recommendation?: string | null } | null;
}): string[] {
  const steps: string[] = [];

  if (!candidate.applicationCompleted) {
    steps.push("Complete application form");
  } else if (!candidate.resumeUrl) {
    steps.push("Upload resume/CV");
  } else if (!candidate.committeeReview) {
    steps.push("Application under committee review");
  } else if (candidate.committeeReview.recommendation === "proceed") {
    steps.push("Schedule interview");
  } else if (candidate.committeeReview.recommendation === "hold") {
    steps.push("Additional information may be requested");
  }

  return steps;
}
