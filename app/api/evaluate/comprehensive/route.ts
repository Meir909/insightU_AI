import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import {
  createAuditLog,
  createEvaluation,
  getAllCandidates,
  getAuditLogs,
  getAuthenticatedAccountByToken,
  getCandidateById,
  updateCandidate,
} from "@/lib/server/prisma";
import {
  evaluateComprehensive,
  EvaluationRequest,
  inVisionURubrics,
} from "@/lib/services/advanced-evaluation";

const evaluationSchema = z.object({
  candidateId: z.string(),
  includeCohortComparison: z.boolean().default(false),
  includeMediaAnalysis: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  if (session.role !== "committee") {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden - Committee only" }, { status: 403 }));
  }

  try {
    const params = evaluationSchema.parse(await request.json());
    const candidate = await getCandidateById(params.candidateId);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const candidateProfile: EvaluationRequest["candidateProfile"] = {
      applicationData: {
        fullName: candidate.fullName,
        email: candidate.email,
        city: candidate.city,
        educationLevel: candidate.educationLevel,
        institution: candidate.institution,
        graduationYear: candidate.graduationYear,
        goals: candidate.goals,
        motivation: {
          whyVisionU: candidate.whyInVision,
          goals: candidate.goals,
          changeAgentVision: candidate.changeAgentVision,
        },
        leadershipDescription: candidate.leadershipDesc,
        teamworkDescription: candidate.teamworkDesc,
        skills: candidate.skills.map((skill) => skill.skill),
      },
      resumeText: candidate.resume?.extractedText || undefined,
      interviewResponses: buildInterviewResponses(candidate),
      videoAnalysis: params.includeMediaAnalysis
        ? candidate.artifacts.filter((artifact) => artifact.type === "video").map((artifact) => artifact.analysis)
        : undefined,
      voiceAnalysis: params.includeMediaAnalysis
        ? candidate.artifacts.filter((artifact) => artifact.type === "audio").map((artifact) => artifact.analysis)
        : undefined,
    };

    let cohortData: EvaluationRequest["cohortData"] | undefined;
    if (params.includeCohortComparison) {
      const cohortCandidates = await getAllCandidates();
      cohortData = cohortCandidates
        .filter((item) => item.id !== params.candidateId && item.evaluations[0]?.overallScore)
        .map((item) => ({
          candidateId: item.id,
          overallScore: item.evaluations[0]?.overallScore || 50,
          dimensionScores: {
            leadership_potential: item.evaluations[0]?.leadershipPotential || 50,
            change_agent_mindset: item.evaluations[0]?.changeAgentMindset || 50,
            adaptability: item.evaluations[0]?.adaptability || 50,
            collaboration: item.evaluations[0]?.communication || 50,
            authenticity: item.evaluations[0]?.authenticity || 50,
          },
        }));
    }

    const evaluation = await evaluateComprehensive({
      candidateId: params.candidateId,
      candidateProfile,
      cohortData,
    });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    const storedEvaluation = await createEvaluation({
      candidateId: params.candidateId,
      hardSkills: evaluation.overallScore,
      softSkills: evaluation.inVisionUFit.overall,
      problemSolving: evaluation.consistency.crossResponseConsistency,
      communication: evaluation.rubricScores.find((score) => score.dimension === "collaboration")?.score ?? evaluation.overallScore,
      adaptability: evaluation.rubricScores.find((score) => score.dimension === "adaptability")?.score ?? evaluation.overallScore,
      leadershipPotential: evaluation.rubricScores.find((score) => score.dimension === "leadership_potential")?.score ?? evaluation.overallScore,
      changeAgentMindset: evaluation.rubricScores.find((score) => score.dimension === "change_agent_mindset")?.score ?? evaluation.overallScore,
      authenticity: evaluation.rubricScores.find((score) => score.dimension === "authenticity")?.score ?? evaluation.overallScore,
      overallScore: evaluation.overallScore,
      confidence: evaluation.recommendation.confidence,
      strengths: evaluation.strengths,
      weaknesses: evaluation.developmentAreas,
      redFlags: evaluation.redFlags,
      recommendation: evaluation.recommendation.verdict,
      reasoning: evaluation.explainability.summary,
      evaluatorType: "advanced_ai",
      evaluatorId: persistedSession?.account.id,
    });

    await updateCandidate(params.candidateId, { overallScore: evaluation.overallScore });
    await createAuditLog({
      action: "COMPREHENSIVE_EVALUATION_COMPLETED",
      entityType: "candidate_evaluation",
      entityId: storedEvaluation.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: params.candidateId,
        evaluation,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        candidateId: params.candidateId,
        evaluation,
        evaluatedAt: evaluation.evaluatedAt,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 }),
      );
    }

    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Evaluation failed" },
        { status: 500 },
      ),
    );
  }
}

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");
  if (!candidateId) {
    return addSecurityHeaders(NextResponse.json({ error: "candidateId required" }, { status: 400 }));
  }

  const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
  if (session.role === "candidate" && persistedSession?.account.candidate?.id !== candidateId) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
  }

  const advancedEvaluation =
    candidate.evaluations.find((evaluation) => evaluation.evaluatorType === "advanced_ai") ?? null;
  if (!advancedEvaluation) {
    return addSecurityHeaders(
      NextResponse.json({ error: "No comprehensive evaluation found. Run POST first." }, { status: 404 }),
    );
  }

  const auditLogs = await getAuditLogs("candidate_evaluation", advancedEvaluation.id);
  const latestSnapshot = auditLogs.find((log) => log.action === "COMPREHENSIVE_EVALUATION_COMPLETED")?.details;

  return addSecurityHeaders(
    NextResponse.json({
      success: true,
      candidateId,
      evaluation: latestSnapshot || {
        overallScore: advancedEvaluation.overallScore,
        recommendation: advancedEvaluation.recommendation,
        strengths: advancedEvaluation.strengths,
        developmentAreas: advancedEvaluation.weaknesses,
        redFlags: advancedEvaluation.redFlags,
        reasoning: advancedEvaluation.reasoning,
      },
    }),
  );
}

export async function OPTIONS() {
  return addSecurityHeaders(
    NextResponse.json({
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
    }),
  );
}

function buildInterviewResponses(candidate: NonNullable<Awaited<ReturnType<typeof getCandidateById>>>) {
  const responses: EvaluationRequest["candidateProfile"]["interviewResponses"] = [];

  if (candidate.whyInVision) {
    responses.push({
      question: "Why do you want to join inVision U?",
      response: candidate.whyInVision,
      type: "motivational",
    });
  }

  if (candidate.goals) {
    responses.push({
      question: "What are your goals for the next 3-5 years?",
      response: candidate.goals,
      type: "motivational",
    });
  }

  if (candidate.changeAgentVision) {
    responses.push({
      question: "What does being a change agent mean to you?",
      response: candidate.changeAgentVision,
      type: "motivational",
    });
  }

  if (candidate.leadershipDesc) {
    responses.push({
      question: "Describe your leadership experience.",
      response: candidate.leadershipDesc,
      type: "behavioral",
    });
  }

  if (candidate.teamworkDesc) {
    responses.push({
      question: "Tell me about a time you worked effectively in a team.",
      response: candidate.teamworkDesc,
      type: "behavioral",
    });
  }

  candidate.interviewSession?.messages.forEach((message, index) => {
    if (message.role !== "user") {
      return;
    }

    responses.push({
      question: `Interview response ${index + 1}`,
      response: message.content,
      type: "behavioral",
      timestamp: message.createdAt.toISOString(),
    });
  });

  return responses;
}
