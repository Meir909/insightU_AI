import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { getCandidate } from "@/lib/api";
import { getAuthenticatedAccountByToken } from "@/lib/server/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await params;
  const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
  if (!hasBackofficeAccess(session.role) && persistedSession?.account.candidate?.id !== id) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const candidate = await getCandidate(id);
  if (!candidate) {
    return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
  }

  return addSecurityHeaders(NextResponse.json({ candidate }));
}
