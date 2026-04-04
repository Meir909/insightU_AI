import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { getCandidateStats, getAllCandidates } from "@/lib/server/prisma";
import { addSecurityHeaders } from "@/lib/server/security";
import { logger } from "@/lib/server/logging";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can view analytics
  if (!hasBackofficeAccess(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await getCandidateStats();
    const candidates = await getAllCandidates();

    logger.api.info("Fetched analytics", {
      sessionId: session.sessionId,
      totalCandidates: stats.total,
    });

    const response = NextResponse.json({
      summary: {
        total_candidates: stats.total,
        shortlisted: stats.byStatus?.shortlisted || 0,
        rejected: stats.rejected,
        in_progress: stats.byStatus?.in_progress || 0,
        completed: stats.byStatus?.completed || 0,
        average_score: Math.round((stats.averageScore || 0) * 10) / 10,
      },
      candidates: candidates.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.fullName,
        status: c.status,
        city: c.city,
        createdAt: c.createdAt,
        progress: c.interviewSession?.progress || 0,
      })),
    });
    
    return addSecurityHeaders(response);
  } catch (error) {
    logger.api.error("Failed to fetch analytics", error as Error);
    
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
