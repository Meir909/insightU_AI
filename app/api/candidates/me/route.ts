import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { findAccountBySessionToken, getCandidateAccountOverview, getCommitteeAccountOverview } from "@/lib/server/account-store";
import { prisma } from "@/lib/server/prisma";
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

    return addSecurityHeaders(NextResponse.json({ account, overview }));
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch profile" },
        { status: 500 },
      ),
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session || session.role !== "candidate") {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    // Find the candidate record linked to this session token
    const account = await prisma.session.findUnique({
      where: { token: session.sessionId },
      include: { account: { include: { candidate: true } } },
    });

    const candidate = account?.account?.candidate;
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const body = await request.json() as {
      city?: string;
      dateOfBirth?: string;
      schoolName?: string;
      goals?: string;
      experience?: string;
      motivationText?: string;
      essayExcerpt?: string;
      skills?: string[];
      portfolioUrl?: string;
      telegramHandle?: string;
    };

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        ...(body.city !== undefined && { city: body.city }),
        ...(body.goals !== undefined && { goals: body.goals }),
        ...(body.experience !== undefined && { experience: body.experience }),
        ...(body.motivationText !== undefined && { motivationText: body.motivationText }),
        ...(body.essayExcerpt !== undefined && { essayExcerpt: body.essayExcerpt }),
        updatedAt: new Date(),
      },
    });

    return addSecurityHeaders(NextResponse.json({ ok: true, candidate: updated }));
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update profile" },
        { status: 500 },
      ),
    );
  }
}
