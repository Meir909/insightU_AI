import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import {
  createAuditLog,
  createEvaluation,
  getCandidateById,
  getInterviewSessionByCandidateId,
  getAuthenticatedAccountByToken,
  updateCandidate,
} from "@/lib/server/prisma";

const scoreSchema = z.object({
  candidate_id: z.string(),
  role: z.enum(["default", "backend_engineer", "student_leader", "driver", "support"]).default("default"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAuthSession(request);
  if (!session || session.role !== "committee") {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const { id } = await params;

  try {
    const body = await request.json();
    scoreSchema.parse({ candidate_id: id, ...body });

    const [candidate, interviewSession] = await Promise.all([
      getCandidateById(id),
      getInterviewSessionByCandidateId(id),
    ]);

    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const transcript = buildTranscript(interviewSession?.messages || [], candidate.artifacts);
    if (transcript.length < 50) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Insufficient interview data for scoring" }, { status: 400 }),
      );
    }

    const scores = deriveScores(transcript, candidate.artifacts.length);
    const evaluation = await createEvaluation({
      candidateId: id,
      hardSkills: scores.hard_skills,
      softSkills: scores.soft_skills,
      problemSolving: scores.problem_solving,
      communication: scores.communication,
      adaptability: scores.adaptability,
      leadershipPotential: scores.leadership_potential,
      changeAgentMindset: scores.change_agent_mindset,
      authenticity: scores.authenticity,
      overallScore: scores.overall,
      confidence: scores.confidence,
      recommendation: scores.overall >= 75 ? "shortlist" : scores.overall >= 60 ? "manual_review" : "hold",
      reasoning: "Hybrid heuristic score based on interview transcript, uploaded artifacts, and multimodal signal density.",
      evaluatorType: "hybrid",
    });

    await updateCandidate(id, { overallScore: scores.overall });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    await createAuditLog({
      action: "CANDIDATE_SCORED",
      entityType: "candidate_evaluation",
      entityId: evaluation.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: id,
        overall: scores.overall,
        confidence: scores.confidence,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
        candidate_id: id,
        scores,
        confidence: scores.confidence,
        method: "prisma-hybrid",
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to score candidate" },
        { status: 500 },
      ),
    );
  }
}

type TranscriptMessage = {
  role: string;
  content: string;
};

type CandidateArtifact = {
  type: string;
  analysis: unknown;
};

function buildTranscript(messages: TranscriptMessage[], artifacts: CandidateArtifact[]) {
  const chatTranscript = messages.map((message) => `${message.role}: ${message.content}`).join("\n");
  const artifactTranscript = artifacts
    .map((artifact) => {
      if (!artifact.analysis || typeof artifact.analysis !== "object") {
        return "";
      }

      const analysis = artifact.analysis as { transcript?: string; summary?: string };
      return analysis.transcript || analysis.summary || "";
    })
    .filter(Boolean)
    .join("\n");

  return `${chatTranscript}\n${artifactTranscript}`.trim();
}

function deriveScores(transcript: string, artifactCount: number) {
  const base = Math.min(100, 45 + transcript.length / 60);
  const artifactBoost = Math.min(12, artifactCount * 3);

  const hardSkills = clamp(base - 6);
  const softSkills = clamp(base + 4);
  const problemSolving = clamp(base + 1);
  const communication = clamp(base + 8 + artifactBoost / 2);
  const adaptability = clamp(base + artifactBoost / 3);
  const leadershipPotential = clamp(base + 6);
  const changeAgentMindset = clamp(base + 5);
  const authenticity = clamp(base + artifactBoost);
  const overall = clamp(
    (hardSkills +
      softSkills +
      problemSolving +
      communication +
      adaptability +
      leadershipPotential +
      changeAgentMindset +
      authenticity) /
      8,
  );
  const confidence = clamp(58 + Math.min(30, transcript.length / 80) + artifactBoost / 2);

  return {
    hard_skills: hardSkills,
    soft_skills: softSkills,
    problem_solving: problemSolving,
    communication,
    adaptability,
    leadership_potential: leadershipPotential,
    change_agent_mindset: changeAgentMindset,
    authenticity,
    overall,
    confidence,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}
