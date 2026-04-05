import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyAuthCookies, clearAuthCookies, createSessionId, getAuthSession, type AuthSession } from "@/lib/server/auth";
import { getAuthenticatedAccountByToken } from "@/lib/server/prisma";
import { addSecurityHeaders } from "@/lib/server/security";

const viewerSessionSchema = z.object({
  role: z.literal("viewer"),
  name: z.string().trim().min(2).max(80).optional(),
});

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ authenticated: false }, { status: 401 }));
  }

  const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
  if (!persistedSession) {
    if (session.role === "viewer") {
      return addSecurityHeaders(
        NextResponse.json({
          authenticated: true,
          session,
        }),
      );
    }
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

export async function POST(request: NextRequest) {
  try {
    const payload = viewerSessionSchema.parse(await request.json());

    const session: AuthSession = {
      sessionId: createSessionId(),
      role: "viewer",
      name: payload.name || "Зритель demo",
      entityId: "viewer-demo",
    };

    const response = NextResponse.json({
      ok: true,
      redirectTo: "/dashboard",
      session,
    });

    return addSecurityHeaders(applyAuthCookies(response, session));
  } catch {
    return addSecurityHeaders(
      NextResponse.json({ error: "Не удалось создать сессию зрителя" }, { status: 400 }),
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return addSecurityHeaders(clearAuthCookies(response));
}
