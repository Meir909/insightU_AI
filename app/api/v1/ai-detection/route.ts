import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { getCandidate } from "@/lib/api";
import { getAuthenticatedAccountByToken } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const candidateId = request.nextUrl.searchParams.get("candidateId");
  if (!candidateId) {
    return addSecurityHeaders(NextResponse.json({ error: "candidateId is required" }, { status: 400 }));
  }

  const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
  if (!hasBackofficeAccess(session.role) && persistedSession?.account.candidate?.id !== candidateId) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const candidate = await getCandidate(candidateId);
  if (!candidate) {
    return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
  }

  return addSecurityHeaders(
    NextResponse.json({
      candidate_id: candidate.id,
      ai_detection_prob: candidate.ai_detection_prob,
      flagged: candidate.ai_detection_prob >= 0.45,
      needs_manual_review: candidate.needs_manual_review,
      signals: candidate.ai_signals,
      explanation:
        candidate.ai_detection_prob >= 0.45
          ? "Signal density indicates elevated synthetic-assistance risk. Manual committee review is required."
          : "No elevated synthetic-assistance risk detected beyond the current review threshold.",
    }),
  );
}
