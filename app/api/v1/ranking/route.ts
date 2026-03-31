import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { getRanking } from "@/lib/api";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session || !hasBackofficeAccess(session.role)) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const ranking = await getRanking();
  return addSecurityHeaders(
    NextResponse.json({
      ranking: ranking
        .sort((left, right) => right.final_score - left.final_score)
        .map((candidate, index) => ({
          rank: index + 1,
          candidate_id: candidate.id,
          code: candidate.code,
          name: candidate.name,
          status: candidate.status,
          final_score: candidate.final_score,
          confidence: candidate.confidence,
          ai_detection_prob: candidate.ai_detection_prob,
          needs_manual_review: candidate.needs_manual_review,
        })),
      count: ranking.length,
    }),
  );
}
