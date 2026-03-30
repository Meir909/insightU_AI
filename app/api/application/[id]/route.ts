import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;
    
    if (!candidate) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Candidates can only view their own application
    if (session.role === "candidate" && session.entityId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Format response based on role
    const baseInfo = {
      id: candidate.id,
      code: candidate.code,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      city: candidate.city,
      status: candidate.status,
      educationLevel: candidate.educationLevel,
      schoolName: candidate.schoolName,
      graduationYear: candidate.graduationYear,
      applicationCompleted: candidate.applicationCompleted,
      applicationSubmittedAt: candidate.applicationSubmittedAt,
    };

    if (session.role === "committee") {
      return NextResponse.json({
        ...baseInfo,
        dateOfBirth: candidate.dateOfBirth,
        achievements: candidate.achievements,
        resumeUrl: candidate.resumeUrl,
        motivation: {
          whyVisionU: candidate.motivationText,
          goals: candidate.goals,
          changeAgentVision: candidate.essayExcerpt,
        },
        hasLeadershipExperience: candidate.hasLeadershipExperience,
        hasTeamExperience: candidate.hasTeamExperience,
        experience: candidate.experience,
        skills: candidate.skills,
        languages: candidate.languages,
        portfolioLinks: candidate.portfolioLinks,
        applicationScores: candidate.applicationScores,
        committeeReview: candidate.committeeReview,
        canReview: !candidate.committeeReview,
      });
    }

    // Candidate view
    return NextResponse.json({
      ...baseInfo,
      scores: candidate.applicationScores,
      nextSteps: getNextSteps(candidate),
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "committee") {
    return NextResponse.json({ error: "Only committee can review applications" }, { status: 403 });
  }

  const { id } = await params;

  const reviewSchema = z.object({
    formalScore: z.number().min(0).max(100),
    informalScore: z.number().min(0).max(100),
    notes: z.string().max(2000),
    recommendation: z.enum(["proceed", "hold", "reject"]),
  });

  try {
    const body = await request.json();
    const review = reviewSchema.parse(body);

    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    candidate.committeeReview = {
      reviewerId: session.sessionId,
      ...review,
      reviewedAt: new Date().toISOString(),
    };

    if (review.recommendation === "proceed") {
      candidate.status = "shortlisted";
    } else if (review.recommendation === "reject") {
      candidate.status = "rejected";
    } else {
      candidate.status = "flagged";
    }
    
    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: `Application ${review.recommendation === "proceed" ? "approved" : review.recommendation === "reject" ? "rejected" : "flagged"}`,
      recommendation: review.recommendation,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit review" },
      { status: 500 }
    );
  }
}

function getNextSteps(candidate: any): string[] {
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
