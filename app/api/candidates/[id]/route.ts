import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getCandidateById, getAuthenticatedAccountByToken, prisma } from "@/lib/server/prisma";
import { addSecurityHeaders } from "@/lib/server/security";
import { logger } from "@/lib/server/logging";

const ALLOWED_STATUSES = ["shortlisted", "flagged", "in_progress", "completed", "rejected"] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session || session.role !== "committee") {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const { id } = await params;

  try {
    const body = await request.json() as { status?: string };
    const status = body.status as AllowedStatus | undefined;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 }
        )
      );
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: { status },
    });

    logger.api.info("Candidate status updated", {
      candidateId: id,
      newStatus: status,
      sessionId: session.sessionId,
      role: session.role,
    });

    return addSecurityHeaders(NextResponse.json({ candidate }));
  } catch (error) {
    logger.api.error("Failed to update candidate status", error as Error, { candidateId: id });
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update candidate" },
        { status: 500 }
      )
    );
  }
}
