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

  // Only committee can view shortlist
  if (!hasBackofficeAccess(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const candidates = await getAllCandidates('shortlisted');

    logger.api.info("Fetched shortlist", {
      sessionId: session.sessionId,
      count: candidates.length,
    });

    const response = NextResponse.json({
      shortlisted: candidates.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.fullName,
        email: c.email,
        phone: c.phone,
        city: c.city,
        status: c.status,
        overallScore: c.overallScore,
        createdAt: c.createdAt,
      })),
      count: candidates.length,
    });
    
    return addSecurityHeaders(response);
  } catch (error) {
    logger.api.error("Failed to fetch shortlist", error as Error);
    
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch shortlist" },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
