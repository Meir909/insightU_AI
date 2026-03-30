import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getPersistedCandidate, getPersistedSessionByAuthSession } from "@/lib/server/serverless-store";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const candidate = await getPersistedCandidate(id);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Candidates can only view their own profile
    if (session.role === "candidate") {
      const account = await findAccountById(session.sessionId);
      if (account?.entityId !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const interviewSession = await getPersistedSessionByAuthSession(
      (await findAccountById(session.sessionId))?.id || ""
    );

    return NextResponse.json({
      candidate,
      session: interviewSession,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

import { findAccountById } from "@/lib/server/serverless-store";
