import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { getAllCandidates } from "@/lib/server/prisma";
import { addSecurityHeaders } from "@/lib/server/security";
import { logger } from "@/lib/server/logging";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can see all candidates
  if (!hasBackofficeAccess(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const candidates = await getAllCandidates();
    
    logger.api.info("Fetched all candidates", {
      count: candidates.length,
      sessionId: session.sessionId,
    });
    
    const response = NextResponse.json({ candidates });
    return addSecurityHeaders(response);
  } catch (error) {
    logger.api.error("Failed to fetch candidates", error as Error);
    
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch candidates" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
