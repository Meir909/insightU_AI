import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { findAccountBySessionToken, getCandidateAccountOverview, getCommitteeAccountOverview } from "@/lib/server/account-store";
import { addSecurityHeaders } from "@/lib/server/security";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    if (session.role === "candidate") {
      const overview = await getCandidateAccountOverview(session.sessionId);
      if (!overview) {
        return addSecurityHeaders(NextResponse.json({ error: "Profile not found" }, { status: 404 }));
      }
      return addSecurityHeaders(NextResponse.json(overview));
    }

    const [account, overview] = await Promise.all([
      findAccountBySessionToken(session.sessionId),
      getCommitteeAccountOverview(session.sessionId),
    ]);

    return addSecurityHeaders(
      NextResponse.json({
        account,
        overview,
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch profile" },
        { status: 500 }
      ),
    );
  }
}
