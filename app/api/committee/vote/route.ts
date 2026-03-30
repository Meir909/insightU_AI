import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getAuthenticatedAccountByToken, getCommitteeMemberByAccountId, recordCommitteeDecision } from "@/lib/server/prisma";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";

const schema = z.object({
  candidateId: z.string().min(1),
  decision: z.enum(["approve", "hold", "reject"]),
  rationale: z.string().min(10).max(600),
});

export async function POST(request: NextRequest) {
  const auth = getAuthSession(request);
  if (!auth || auth.role !== "committee") {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const payload = schema.parse(sanitizeObject(await request.json()));
  const persistedSession = await getAuthenticatedAccountByToken(auth.sessionId);
  if (!persistedSession) {
    return addSecurityHeaders(NextResponse.json({ error: "Session expired" }, { status: 401 }));
  }

  const member = await getCommitteeMemberByAccountId(persistedSession.account.id);
  if (!member) {
    return addSecurityHeaders(NextResponse.json({ error: "Committee member not found" }, { status: 404 }));
  }

  const decision = payload.decision === "approve" ? "approved" : payload.decision === "reject" ? "rejected" : "hold";
  const result = await recordCommitteeDecision({
    candidateId: payload.candidateId,
    committeeId: member.id,
    actorId: persistedSession.account.id,
    actorName: member.name,
    decision,
    notes: payload.rationale,
    recommendation: payload.decision,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  });

  return addSecurityHeaders(
    NextResponse.json({
      vote: result.vote,
      resolution: result.resolution,
    }),
  );
}
