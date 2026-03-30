import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getPersistedCandidates } from "@/lib/server/serverless-store";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can view analytics
  if (session.role !== "committee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const candidates = await getPersistedCandidates();
    
    const total = candidates.length;
    const shortlisted = candidates.filter(c => c.status === "shortlisted").length;
    const rejected = candidates.filter(c => c.status === "rejected").length;
    const inProgress = candidates.filter(c => c.status === "in_progress").length;
    const completed = candidates.filter(c => c.status === "completed").length;
    const flagged = candidates.filter(c => c.status === "flagged").length;

    // Calculate average score if available
    const scores = candidates
      .map(c => (c as any).scoreUpdate?.finalScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    
    const averageScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    return NextResponse.json({
      summary: {
        total_candidates: total,
        shortlisted,
        rejected,
        in_progress: inProgress,
        completed,
        flagged,
        average_score: Math.round(averageScore * 10) / 10,
      },
      candidates: candidates.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        status: c.status,
        city: c.city,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
