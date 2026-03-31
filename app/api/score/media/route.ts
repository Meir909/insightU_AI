import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import {
  createAuditLog,
  createEvaluation,
  getAuthenticatedAccountByToken,
  getCandidateById,
  updateCandidate,
} from "@/lib/server/prisma";

const mediaScoreSchema = z.object({
  candidateId: z.string(),
  includeVideo: z.boolean().default(true),
  includeVoice: z.boolean().default(true),
  weightVideo: z.number().min(0).max(1).default(0.4),
  weightVoice: z.number().min(0).max(1).default(0.3),
  weightText: z.number().min(0).max(1).default(0.3),
});

type VideoScore = {
  communication: number;
  presentation: number;
  content: number;
  behavioral: number;
  overall: number;
  samples: number;
};

type VoiceScore = {
  clarity: number;
  confidence: number;
  sentiment: string;
  overall: number;
  samples: number;
};

type FinalScore = {
  overall: number;
  communication: number;
  confidence: number;
  content: number;
};

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  if (session.role !== "committee") {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  try {
    const params = mediaScoreSchema.parse(await request.json());
    const candidate = await getCandidateById(params.candidateId);

    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const videoAnalyses = candidate.artifacts
      .filter((artifact) => artifact.type === "video")
      .map((artifact) => artifact.analysis)
      .filter(isRecord) as Record<string, unknown>[];
    const voiceAnalyses = candidate.artifacts
      .filter((artifact) => artifact.type === "audio")
      .map((artifact) => artifact.analysis)
      .filter(isRecord) as Record<string, unknown>[];

    const latestEvaluation = candidate.evaluations[0] ?? null;
    const latestSession = candidate.interviewSession;
    const derivedSessionScore =
      average(
        [
          latestSession?.cognitiveScore ?? 0,
          latestSession?.leadershipScore ?? 0,
          latestSession?.growthScore ?? 0,
          latestSession?.decisionScore ?? 0,
          latestSession?.motivationScore ?? 0,
          latestSession?.authenticityScore ?? 0,
        ].filter((value) => value > 0),
      ) || 70;

    const videoScore = params.includeVideo ? buildVideoScore(videoAnalyses) : null;
    const voiceScore = params.includeVoice ? buildVoiceScore(voiceAnalyses) : null;
    const textScore = {
      overall: latestEvaluation?.overallScore ?? candidate.overallScore ?? derivedSessionScore,
      hardSkills: latestEvaluation?.hardSkills ?? latestSession?.cognitiveScore ?? 70,
      softSkills: latestEvaluation?.softSkills ?? latestSession?.leadershipScore ?? 70,
      problemSolving: latestEvaluation?.problemSolving ?? latestSession?.decisionScore ?? 70,
      communication: latestEvaluation?.communication ?? latestSession?.motivationScore ?? 70,
      adaptability: latestEvaluation?.adaptability ?? latestSession?.growthScore ?? 70,
    };

    const finalScore = calculateFinalScore(params, videoScore, voiceScore, textScore);
    const recommendation = generateRecommendation(finalScore.overall, videoScore, voiceScore);
    const mediaScores = {
      video: videoScore,
      voice: voiceScore,
      text: textScore,
      final: finalScore,
      weights: {
        video: params.weightVideo,
        voice: params.weightVoice,
        text: params.weightText,
      },
      calculatedAt: new Date().toISOString(),
    };

    const evaluation = await createEvaluation({
      candidateId: candidate.id,
      hardSkills: finalScore.content,
      softSkills: finalScore.confidence,
      problemSolving: textScore.problemSolving,
      communication: finalScore.communication,
      adaptability: Math.round((textScore.adaptability + finalScore.confidence) / 2),
      leadershipPotential: Math.round((finalScore.confidence + finalScore.communication) / 2),
      changeAgentMindset: Math.round((textScore.overall + finalScore.content) / 2),
      authenticity: Math.round((finalScore.confidence + textScore.communication) / 2),
      overallScore: finalScore.overall,
      confidence: Math.round((videoScore?.overall ?? finalScore.overall) * 0.4 + (voiceScore?.overall ?? finalScore.overall) * 0.3 + textScore.overall * 0.3),
      strengths: buildStrengths(videoScore, voiceScore, finalScore),
      weaknesses: buildWeaknesses(videoScore, voiceScore, finalScore),
      redFlags: buildMediaRedFlags(videoScore, voiceScore),
      recommendation: recommendation.decision,
      reasoning: "Media-enhanced evaluation combines persisted text, audio, and video evidence from the candidate profile.",
      evaluatorType: "ai_media",
    });
    await updateCandidate(candidate.id, { overallScore: finalScore.overall });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    await createAuditLog({
      action: "MEDIA_SCORE_CALCULATED",
      entityType: "candidate_evaluation",
      entityId: evaluation.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: params.candidateId,
        mediaScores,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        candidateId: params.candidateId,
        mediaScores,
        breakdown: {
          videoAvailable: !!videoScore,
          voiceAvailable: !!voiceScore,
          textAvailable: true,
          samples: {
            video: videoScore?.samples || 0,
            voice: voiceScore?.samples || 0,
          },
        },
        recommendation,
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
        { error: error instanceof Error ? error.message : "Failed to calculate media score" },
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

  try {
    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    if (session.role === "candidate" && persistedSession?.account.candidate?.id !== candidateId) {
      return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const latestMediaEvaluation =
      candidate.evaluations.find((evaluation) => evaluation.evaluatorType === "ai_media") ?? null;

    return addSecurityHeaders(
      NextResponse.json({
        candidateId,
        mediaScores: latestMediaEvaluation
          ? {
              final: {
                overall: latestMediaEvaluation.overallScore,
                communication: latestMediaEvaluation.communication,
                confidence: latestMediaEvaluation.softSkills,
                content: latestMediaEvaluation.hardSkills,
              },
              recommendation: latestMediaEvaluation.recommendation,
              confidence: latestMediaEvaluation.confidence,
              calculatedAt: latestMediaEvaluation.createdAt.toISOString(),
            }
          : null,
        videoCount: candidate.artifacts.filter((artifact) => artifact.type === "video").length,
        voiceCount: candidate.artifacts.filter((artifact) => artifact.type === "audio").length,
        hasAnalysis: !!latestMediaEvaluation,
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch media scores" },
        { status: 500 },
      ),
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNestedNumber(record: Record<string, unknown>, path: string[], fallback = 0) {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) {
      return fallback;
    }
    current = current[key];
  }
  return readNumber(current, fallback);
}

function readNestedString(record: Record<string, unknown>, path: string[], fallback = "neutral") {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) {
      return fallback;
    }
    current = current[key];
  }
  return typeof current === "string" ? current : fallback;
}

function buildVideoScore(videoAnalyses: Record<string, unknown>[]): VideoScore | null {
  if (videoAnalyses.length === 0) {
    return null;
  }

  const communication = average(videoAnalyses.map((analysis) => readNestedNumber(analysis, ["scores", "communication"], readNestedNumber(analysis, ["behavioralAnalysis", "confidence"], 68))));
  const presentation = average(videoAnalyses.map((analysis) => readNestedNumber(analysis, ["scores", "presentation"], readNestedNumber(analysis, ["visualAnalysis", "engagement"], 66))));
  const content = average(videoAnalyses.map((analysis) => readNestedNumber(analysis, ["scores", "content"], readNestedNumber(analysis, ["confidence"], 65))));
  const behavioral = average(videoAnalyses.map((analysis) => readNestedNumber(analysis, ["behavioralAnalysis", "confidence"], readNestedNumber(analysis, ["confidence"], 64))));

  return {
    communication,
    presentation,
    content,
    behavioral,
    overall: Math.round((communication + presentation + content + behavioral) / 4),
    samples: videoAnalyses.length,
  };
}

function buildVoiceScore(voiceAnalyses: Record<string, unknown>[]): VoiceScore | null {
  if (voiceAnalyses.length === 0) {
    return null;
  }

  const clarity = average(voiceAnalyses.map((analysis) => readNestedNumber(analysis, ["confidence"], readNestedNumber(analysis, ["speechMetrics", "clarity"], 67))));
  const confidence = average(voiceAnalyses.map((analysis) => readNestedNumber(analysis, ["confidence"], readNestedNumber(analysis, ["emotions", "confidence"], 65))));
  const sentiment = mode(voiceAnalyses.map((analysis) => readNestedString(analysis, ["sentiment"], "neutral")));

  return {
    clarity,
    confidence,
    sentiment,
    overall: Math.round((clarity + confidence) / 2),
    samples: voiceAnalyses.length,
  };
}

function calculateFinalScore(
  params: z.infer<typeof mediaScoreSchema>,
  videoScore: VideoScore | null,
  voiceScore: VoiceScore | null,
  textScore: { overall: number; hardSkills: number; softSkills: number; problemSolving: number; communication: number; adaptability: number },
): FinalScore {
  const finalScore: FinalScore = {
    overall: 0,
    communication: 0,
    confidence: 0,
    content: 0,
  };

  let totalWeight = 0;

  if (videoScore) {
    finalScore.overall += videoScore.overall * params.weightVideo;
    finalScore.communication += videoScore.communication * params.weightVideo;
    finalScore.confidence += videoScore.behavioral * params.weightVideo;
    finalScore.content += videoScore.content * params.weightVideo;
    totalWeight += params.weightVideo;
  }

  if (voiceScore) {
    finalScore.overall += voiceScore.overall * params.weightVoice;
    finalScore.communication += voiceScore.clarity * params.weightVoice;
    finalScore.confidence += voiceScore.confidence * params.weightVoice;
    totalWeight += params.weightVoice;
  }

  finalScore.overall += textScore.overall * params.weightText;
  finalScore.communication += textScore.communication * params.weightText;
  finalScore.confidence += textScore.softSkills * params.weightText;
  finalScore.content += textScore.hardSkills * params.weightText;
  totalWeight += params.weightText;

  if (totalWeight > 0) {
    finalScore.overall = Math.round(finalScore.overall / totalWeight);
    finalScore.communication = Math.round(finalScore.communication / totalWeight);
    finalScore.confidence = Math.round(finalScore.confidence / totalWeight);
    finalScore.content = Math.round(finalScore.content / totalWeight);
  }

  return finalScore;
}

function buildStrengths(videoScore: VideoScore | null, voiceScore: VoiceScore | null, finalScore: FinalScore) {
  const strengths: string[] = [];
  if (videoScore && videoScore.overall >= 75) strengths.push("Strong recorded video performance");
  if (voiceScore && voiceScore.overall >= 72) strengths.push("Confident audio delivery");
  if (finalScore.communication >= 75) strengths.push("Clear communication across channels");
  if (finalScore.content >= 75) strengths.push("Substantive content quality");
  return strengths;
}

function buildWeaknesses(videoScore: VideoScore | null, voiceScore: VoiceScore | null, finalScore: FinalScore) {
  const weaknesses: string[] = [];
  if (videoScore && videoScore.overall < 60) weaknesses.push("Video evidence suggests weaker presentation stability");
  if (voiceScore && voiceScore.overall < 60) weaknesses.push("Voice evidence suggests lower speaking confidence");
  if (finalScore.content < 60) weaknesses.push("Content depth remains below target threshold");
  return weaknesses;
}

function buildMediaRedFlags(videoScore: VideoScore | null, voiceScore: VoiceScore | null) {
  const redFlags: string[] = [];
  if (videoScore && videoScore.behavioral < 50) redFlags.push("Low behavioral confidence in recorded video");
  if (voiceScore && voiceScore.confidence < 50) redFlags.push("Low confidence in recorded voice");
  if (voiceScore && voiceScore.sentiment === "negative") redFlags.push("Negative sentiment detected in audio evidence");
  return redFlags;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function mode(values: string[]): string {
  if (values.length === 0) return "neutral";
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
}

function generateRecommendation(
  overall: number,
  video: VideoScore | null,
  voice: VoiceScore | null,
): {
  decision: "strong_proceed" | "proceed" | "review" | "hold" | "reject";
  confidence: number;
  reasoning: string;
} {
  if (overall >= 85 && (video?.behavioral ?? 0) > 80) {
    return {
      decision: "strong_proceed",
      confidence: 0.9,
      reasoning: "Excellent video interview performance with strong behavioral indicators",
    };
  }

  if (overall >= 75) {
    return {
      decision: "proceed",
      confidence: 0.8,
      reasoning: "Strong overall performance across all assessment types",
    };
  }

  if (overall >= 65) {
    return {
      decision: "review",
      confidence: 0.7,
      reasoning: "Moderate scores, recommend manual review for final decision",
    };
  }

  if (overall >= 50) {
    return {
      decision: "hold",
      confidence: 0.6,
      reasoning: "Below average performance, consider additional assessment",
    };
  }

  return {
    decision: "reject",
    confidence: 0.75,
    reasoning: voice?.confidence && voice.confidence < 50
      ? "Low confidence in audio evidence and insufficient overall performance"
      : "Performance does not meet minimum requirements",
  };
}
