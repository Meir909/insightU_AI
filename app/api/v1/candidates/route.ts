import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { getRanking } from "@/lib/api";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session || !hasBackofficeAccess(session.role)) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const candidates = await getRanking();
  return addSecurityHeaders(
    NextResponse.json({
      candidates,
      count: candidates.length,
    }),
  );
}
