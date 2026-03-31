import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getCandidateById, getAuthenticatedAccountByToken } from "@/lib/server/prisma";
import { addSecurityHeaders } from "@/lib/server/security";
import { logger } from "@/lib/server/logging";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const candidate = await getCandidateById(id);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Candidates can only view their own profile
    if (session.role === "candidate") {
      const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
      if (persistedSession?.account.candidate?.id !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    logger.api.info("Fetched candidate details", {
      candidateId: id,
      sessionId: session.sessionId,
      role: session.role,
    });

    const response = NextResponse.json({
      candidate,
      session: candidate.interviewSession,
    });
    return addSecurityHeaders(response);
  } catch (error) {
    logger.api.error("Failed to fetch candidate", error as Error, { candidateId: id });
    
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch candidate" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
