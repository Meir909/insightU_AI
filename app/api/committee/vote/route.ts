import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import {
  getAuthenticatedAccountByToken,
  getCommitteeMemberByAccountId,
  getCandidateVotes,
  recordCommitteeDecision,
} from "@/lib/server/prisma";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";
import { validateJustification, detectBias, type VoteData } from "@/lib/services/bias-detector";

const schema = z.object({
  candidateId: z.string().min(1),
  decision: z.enum(["approve", "hold", "reject"]),
  rationale: z.string().min(30).max(600),
});

export async function POST(request: NextRequest) {
  const auth = getAuthSession(request);
  if (!auth || auth.role !== "committee") {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(sanitizeObject(await request.json()));
  } catch {
    return addSecurityHeaders(
      NextResponse.json({ error: "Обоснование должно содержать не менее 30 символов" }, { status: 400 }),
    );
  }

  // Validate justification quality (no generic phrases)
  const justification = validateJustification(payload.rationale);
  if (!justification.valid) {
    return addSecurityHeaders(
      NextResponse.json({ error: justification.issues[0] }, { status: 422 }),
    );
  }

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

  // Run bias detection after recording vote (at least 2 votes needed for analysis)
  const allVotes = await getCandidateVotes(payload.candidateId);
  let biasCheck = null;

  if (allVotes.length >= 2) {
    const voteData: VoteData[] = allVotes.map((v) => ({
      memberId: v.committeeId,
      memberName: v.committee.name,
      score: v.formalScore ?? 50,
      decision: (v.decision === "approved" || v.decision === "rejected" || v.decision === "hold")
        ? v.decision
        : "hold",
      rationale: v.notes ?? "",
    }));
    biasCheck = detectBias(voteData);
  }

  return addSecurityHeaders(
    NextResponse.json({
      vote: result.vote,
      resolution: result.resolution,
      biasCheck,
    }),
  );
}
