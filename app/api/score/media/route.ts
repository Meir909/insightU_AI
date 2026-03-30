import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";

const mediaScoreSchema = z.object({
  candidateId: z.string(),
  includeVideo: z.boolean().default(true),
  includeVoice: z.boolean().default(true),
  weightVideo: z.number().min(0).max(1).default(0.4),
  weightVoice: z.number().min(0).max(1).default(0.3),
  weightText: z.number().min(0).max(1).default(0.3),
});

/**
 * Calculate comprehensive media-enhanced score
 * Combines video interview, voice messages, and text chat
 */
export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can calculate media scores
  if (session.role !== "committee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const params = mediaScoreSchema.parse(body);

    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === params.candidateId) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Gather all available media analyses
    const videoAnalyses = candidate.videoInterviews?.map((v: any) => v.analysis) || [];
    const voiceAnalyses = candidate.voiceMessages?.map((v: any) => v.analysis) || [];

    // Calculate video scores (if available)
    let videoScore = null;
    if (params.includeVideo && videoAnalyses.length > 0) {
      const avgVideo = {
        communication: average(videoAnalyses.map((a: any) => a.scores?.communication || 0)),
        presentation: average(videoAnalyses.map((a: any) => a.scores?.presentation || 0)),
        content: average(videoAnalyses.map((a: any) => a.scores?.content || 0)),
        behavioral: average(videoAnalyses.map((a: any) => a.behavioralAnalysis?.confidence || 0)),
      };
      
      videoScore = {
        ...avgVideo,
        overall: (avgVideo.communication + avgVideo.presentation + avgVideo.content + avgVideo.behavioral) / 4,
        samples: videoAnalyses.length,
      };
    }

    // Calculate voice scores (if available)
    let voiceScore = null;
    if (params.includeVoice && voiceAnalyses.length > 0) {
      const avgVoice = {
        clarity: average(voiceAnalyses.map((a: any) => a.confidence || 0)),
        confidence: average(voiceAnalyses.map((a: any) => a.confidence || 0)),
        sentiment: mode(voiceAnalyses.map((a: any) => a.sentiment || "neutral")),
      };
      
      voiceScore = {
        ...avgVoice,
        overall: (avgVoice.clarity + avgVoice.confidence) / 2,
        samples: voiceAnalyses.length,
      };
    }

    // Get text chat scores (existing)
    const textScore = candidate.interviewSessions?.[0]?.scoreUpdate || {
      overall: 70,
      hardSkills: 70,
      softSkills: 70,
      problemSolving: 70,
      communication: 70,
      adaptability: 70,
    };

    // Calculate weighted final score
    let finalScore = {
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

    // Add text chat contribution
    finalScore.overall += (textScore.overall || textScore.finalScore || 70) * params.weightText;
    finalScore.communication += textScore.communication * params.weightText;
    finalScore.confidence += textScore.softSkills * params.weightText;
    finalScore.content += textScore.hardSkills * params.weightText;
    totalWeight += params.weightText;

    // Normalize
    if (totalWeight > 0) {
      finalScore.overall = Math.round(finalScore.overall / totalWeight);
      finalScore.communication = Math.round(finalScore.communication / totalWeight);
      finalScore.confidence = Math.round(finalScore.confidence / totalWeight);
      finalScore.content = Math.round(finalScore.content / totalWeight);
    }

    // Save media-enhanced score
    candidate.mediaScores = {
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

    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      candidateId: params.candidateId,
      mediaScores: candidate.mediaScores,
      breakdown: {
        videoAvailable: !!videoScore,
        voiceAvailable: !!voiceScore,
        textAvailable: true,
        samples: {
          video: videoScore?.samples || 0,
          voice: voiceScore?.samples || 0,
        },
      },
      recommendation: generateRecommendation(finalScore.overall, videoScore, voiceScore),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate media score" },
      { status: 500 }
    );
  }
}

/**
 * Get media analysis results for a candidate
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

  // Candidates can only view their own scores
  if (session.role === "candidate" && session.entityId !== candidateId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === candidateId) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({
      candidateId,
      mediaScores: candidate.mediaScores || null,
      videoCount: candidate.videoInterviews?.length || 0,
      voiceCount: candidate.voiceMessages?.length || 0,
      hasAnalysis: !!candidate.mediaScores,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch media scores" },
      { status: 500 }
    );
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function mode(values: string[]): string {
  if (values.length === 0) return "neutral";
  const counts: Record<string, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function generateRecommendation(
  overall: number,
  video: any,
  voice: any
): {
  decision: "strong_proceed" | "proceed" | "review" | "hold" | "reject";
  confidence: number;
  reasoning: string;
} {
  if (overall >= 85 && video?.behavioral > 80) {
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
    reasoning: "Performance does not meet minimum requirements",
  };
}
