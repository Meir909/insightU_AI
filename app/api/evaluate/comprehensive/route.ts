import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";
import { 
  evaluateComprehensive, 
  EvaluationRequest,
  inVisionURubrics 
} from "@/lib/services/advanced-evaluation";

// Schema for evaluation request
const evaluationSchema = z.object({
  candidateId: z.string(),
  includeCohortComparison: z.boolean().default(false),
  includeMediaAnalysis: z.boolean().default(true),
});

/**
 * POST /api/evaluate/comprehensive
 * Run comprehensive advanced evaluation on a candidate
 */
export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can run comprehensive evaluations
  if (session.role !== "committee") {
    return NextResponse.json({ error: "Forbidden - Committee only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const params = evaluationSchema.parse(body);

    // Get candidate data
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === params.candidateId) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Build candidate profile from stored data
    const candidateProfile: EvaluationRequest["candidateProfile"] = {
      applicationData: {
        fullName: candidate.fullName,
        email: candidate.email,
        education: candidate.education,
        achievements: candidate.achievements,
        motivation: candidate.motivation,
        experience: candidate.experience,
        skills: candidate.skills,
      },
      resumeText: candidate.resume?.extractedText || undefined,
      interviewResponses: buildInterviewResponses(candidate),
      videoAnalysis: params.includeMediaAnalysis ? candidate.videoAnalysis : undefined,
      voiceAnalysis: params.includeMediaAnalysis ? candidate.voiceAnalysis : undefined,
    };

    // Build cohort data for comparison if requested
    let cohortData: EvaluationRequest["cohortData"] | undefined;
    if (params.includeCohortComparison) {
      cohortData = store.candidates
        .filter((c: any) => c.id !== params.candidateId && c.evaluation?.overallScore)
        .map((c: any) => ({
          candidateId: c.id,
          overallScore: c.evaluation?.overallScore || 50,
          dimensionScores: c.evaluation?.dimensionScores || {},
        }));
    }

    // Run comprehensive evaluation
    const evaluationRequest: EvaluationRequest = {
      candidateId: params.candidateId,
      candidateProfile,
      cohortData,
    };

    const evaluation = await evaluateComprehensive(evaluationRequest);

    // Save evaluation to candidate record
    candidate.advancedEvaluation = {
      ...evaluation,
      evaluatedBy: session.entityId,
    };
    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      candidateId: params.candidateId,
      evaluation: {
        // Summary for quick view
        summary: {
          overallScore: evaluation.overallScore,
          percentile: evaluation.percentile,
          inVisionUFit: evaluation.inVisionUFit.verdict,
          recommendation: evaluation.recommendation.verdict,
          confidence: evaluation.recommendation.confidence,
          priority: evaluation.recommendation.priority,
        },
        // Detailed scores
        rubricScores: evaluation.rubricScores,
        // InVision U specific
        inVisionUFit: evaluation.inVisionUFit,
        // Potential forecast
        potentialForecast: evaluation.potentialForecast,
        // Consistency
        consistency: evaluation.consistency,
        // Comparison
        comparison: evaluation.comparison,
        // Strengths & development
        strengths: evaluation.strengths,
        developmentAreas: evaluation.developmentAreas,
        // Red flags
        redFlags: evaluation.redFlags,
        // Full explainability
        explainability: evaluation.explainability,
        // Full recommendation
        recommendation: evaluation.recommendation,
      },
      evaluatedAt: evaluation.evaluatedAt,
    });

  } catch (error) {
    console.error("Comprehensive evaluation error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/evaluate/comprehensive?candidateId=xxx
 * Get existing comprehensive evaluation
 */
export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  }

  // Get candidate data
  const store = getStore();
  const candidate = store.candidates.find((c: any) => c.id === candidateId) as any;

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Check permissions
  if (session.role === "candidate" && session.entityId !== candidateId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!candidate.advancedEvaluation) {
    return NextResponse.json(
      { error: "No comprehensive evaluation found. Run POST first." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    candidateId,
    evaluation: candidate.advancedEvaluation,
  });
}

/**
 * GET /api/evaluate/comprehensive/rubrics
 * Get evaluation rubrics (for reference)
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    rubrics: inVisionURubrics,
    description: "Structured evaluation rubrics for inVision U candidate assessment",
    usage: {
      endpoint: "POST /api/evaluate/comprehensive",
      body: {
        candidateId: "string (required)",
        includeCohortComparison: "boolean (default: false)",
        includeMediaAnalysis: "boolean (default: true)",
      },
    },
  });
}

// Helper function to build interview responses from candidate data
function buildInterviewResponses(candidate: any): EvaluationRequest["candidateProfile"]["interviewResponses"] {
  const responses: EvaluationRequest["candidateProfile"]["interviewResponses"] = [];

  // Add motivation question
  if (candidate.motivation?.whyInVision) {
    responses.push({
      question: "Why do you want to join inVision U?",
      response: candidate.motivation.whyInVision,
      type: "motivational",
    });
  }

  // Add goals question
  if (candidate.motivation?.goals) {
    responses.push({
      question: "What are your goals for the next 3-5 years?",
      response: candidate.motivation.goals,
      type: "motivational",
    });
  }

  // Add change agent question
  if (candidate.motivation?.changeAgentVision) {
    responses.push({
      question: "What does being a 'change agent' mean to you?",
      response: candidate.motivation.changeAgentVision,
      type: "motivational",
    });
  }

  // Add leadership experience
  if (candidate.experience?.leadership) {
    responses.push({
      question: "Describe your leadership experience.",
      response: candidate.experience.leadership,
      type: "behavioral",
    });
  }

  // Add team experience
  if (candidate.experience?.teamwork) {
    responses.push({
      question: "Tell me about a time you worked effectively in a team.",
      response: candidate.experience.teamwork,
      type: "behavioral",
    });
  }

  // Add chat interview responses if available
  if (candidate.interviewChat?.responses) {
    candidate.interviewChat.responses.forEach((resp: any) => {
      responses.push({
        question: resp.question,
        response: resp.response,
        type: resp.type || "behavioral",
        timestamp: resp.timestamp,
      });
    });
  }

  return responses;
}
