import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { envFlags } from "@/lib/env";
import { getAuthSession } from "@/lib/server/auth";
import { backendFetch } from "@/lib/server/backend-client";
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

  if (envFlags.backend) {
    try {
      return NextResponse.json(
        await backendFetch<{ vote: unknown }>(
          "/api/v1/committee/vote",
          {
            method: "POST",
            body: JSON.stringify({
              candidate_id: payload.candidateId,
              decision: payload.decision,
              rationale: payload.rationale,
            }),
          },
          auth.sessionId,
        ),
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save committee vote" },
        { status: 500 },
      );
    }
  }

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
