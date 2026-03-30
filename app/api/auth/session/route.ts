import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getAuthSession } from "@/lib/server/auth";
import { getAuthenticatedAccountByToken } from "@/lib/server/prisma";
import { addSecurityHeaders } from "@/lib/server/security";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ authenticated: false }, { status: 401 }));
  }

  const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
  if (!persistedSession) {
    return addSecurityHeaders(NextResponse.json({ authenticated: false }, { status: 401 }));
  }

  return addSecurityHeaders(
    NextResponse.json({
      authenticated: true,
      session: {
        sessionId: persistedSession.token,
        role: persistedSession.account.role,
        name: persistedSession.account.name,
        email: persistedSession.account.email ?? undefined,
        phone: persistedSession.account.phone ?? undefined,
        entityId:
          persistedSession.account.candidate?.id ??
          persistedSession.account.committeeMember?.id ??
          session.entityId,
      },
    }),
  );
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return addSecurityHeaders(clearAuthCookies(response));
}
