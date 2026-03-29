import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { recordCommitteeVote, resolveCommitteeMember } from "@/lib/server/persistent-store";

const schema = z.object({
  candidateId: z.string().min(1),
  decision: z.enum(["approve", "hold", "reject"]),
  rationale: z.string().min(10).max(600),
});

export async function POST(request: NextRequest) {
  const auth = getAuthSession(request);
  if (!auth || auth.role !== "committee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = schema.parse(await request.json());
  const member = await resolveCommitteeMember(auth.email, auth.name);
  if (!member) {
    return NextResponse.json({ error: "Committee member not found" }, { status: 404 });
  }

  const candidate = await recordCommitteeVote({
    candidateId: payload.candidateId,
    memberId: member.id,
    memberName: member.name,
    decision: payload.decision,
    rationale: payload.rationale,
  });

  return NextResponse.json({ candidate });
}
