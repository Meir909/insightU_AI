import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getPersistedCandidate, getPersistedSessionByAuthSession } from "@/lib/server/serverless-store";

const scoreSchema = z.object({
  candidate_id: z.string(),
  role: z.enum(["default", "backend_engineer", "student_leader", "driver", "support"]).default("default"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can score candidates
  if (session.role !== "committee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { role } = scoreSchema.parse({ candidate_id: id, ...body });

    const candidate = await getPersistedCandidate(id);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const interviewSession = await getPersistedSessionByAuthSession(id);
    
    // Build transcript from messages
    const transcript = interviewSession?.messages
      ?.map((m: any) => `${m.role}: ${m.content}`)
      .join("\n") || "";

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        { error: "Insufficient interview data for scoring" },
        { status: 400 }
      );
    }

    // Call AI scoring service
    const scoringResult = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/ai/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: id,
        role,
        interview_transcript: transcript,
      }),
    });

    if (!scoringResult.ok) {
      // Fallback to simple scoring if AI service not available
      const fallbackScores = {
        hard_skills: Math.min(100, 50 + transcript.length / 100),
        soft_skills: Math.min(100, 60 + transcript.length / 80),
        problem_solving: Math.min(100, 55 + transcript.length / 90),
        communication: Math.min(100, 65 + transcript.length / 70),
        adaptability: Math.min(100, 58 + transcript.length / 85),
        overall: 0,
      };
      fallbackScores.overall = Object.values(fallbackScores).slice(0, 5).reduce((a, b) => a + b, 0) / 5;

      return NextResponse.json({
        candidate_id: id,
        scores: fallbackScores,
        confidence: 0.7,
        method: "fallback",
      });
    }

    const aiScores = await scoringResult.json();
    return NextResponse.json(aiScores);

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to score candidate" },
      { status: 500 }
    );
  }
}
