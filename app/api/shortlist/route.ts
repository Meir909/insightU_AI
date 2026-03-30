import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getPersistedCandidates } from "@/lib/server/serverless-store";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only committee can view shortlist
  if (session.role !== "committee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const candidates = await getPersistedCandidates();
    
    const shortlisted = candidates.filter(
      c => c.status === "shortlisted" || c.status === "completed"
    );

    return NextResponse.json({
      shortlisted: shortlisted.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        status: c.status,
        createdAt: c.createdAt,
      })),
      count: shortlisted.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch shortlist" },
      { status: 500 }
    );
  }
}
