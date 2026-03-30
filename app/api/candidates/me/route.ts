import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { findAccountById } from "@/lib/server/serverless-store";
import { getCandidateAccountOverview } from "@/lib/server/account-store";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get own profile
    if (session.role === "candidate") {
      const overview = await getCandidateAccountOverview(session.sessionId);
      if (!overview) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      return NextResponse.json(overview);
    }

    // Committee members get their own overview
    return NextResponse.json({
      account: await findAccountById(session.sessionId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
