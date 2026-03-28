import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { appendUserMessage, getOrCreateSession } from "@/lib/server/interview-store";
import { getServiceLabel } from "@/lib/server/interviewer";

const postSchema = z.object({
  message: z.string().min(1),
  session_id: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const sessionAuth = getAuthSession(request);
  if (!sessionAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const session = await getOrCreateSession(sessionId, sessionAuth.sessionId);
  return NextResponse.json({
    messages: session.messages,
    progress: session.progress,
    status: session.status,
    score_update: session.scoreUpdate,
    phase: session.phase,
    agent: getServiceLabel(),
  });
}

export async function POST(request: NextRequest) {
  const sessionAuth = getAuthSession(request);
  if (!sessionAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = postSchema.parse(await request.json());
  const result = await appendUserMessage(payload.session_id, sessionAuth.sessionId, payload.message);
  return NextResponse.json({
    reply: result.reply,
    progress: result.progress,
    status: result.status,
    score_update: result.score_update,
    phase: result.phase,
    messages: result.messages,
  });
}
