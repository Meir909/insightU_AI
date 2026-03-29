import { NextRequest, NextResponse } from "next/server";
import { envFlags } from "@/lib/env";
import { backendFetch } from "@/lib/server/backend-client";
import { clearAuthCookies, getAuthSession } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (envFlags.backend) {
    try {
      const data = await backendFetch<{
        account: {
          role: "candidate" | "committee";
          name: string;
          email?: string | null;
          phone?: string | null;
          entity_id: string;
        };
      }>("/api/v1/auth/me", undefined, session.sessionId);

      return NextResponse.json({
        authenticated: true,
        session: {
          ...session,
          role: data.account.role,
          name: data.account.name,
          email: data.account.email ?? undefined,
          phone: data.account.phone ?? undefined,
          entityId: data.account.entity_id,
        },
      });
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  }

  return NextResponse.json({
    authenticated: true,
    session,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAuthCookies(response);
}
