import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { envFlags } from "@/lib/env";
import { getAuthSession } from "@/lib/server/auth";
import { backendFetch } from "@/lib/server/backend-client";
import { appendUserMessage, getOrCreateSession } from "@/lib/server/interview-store";
import { getServiceLabel } from "@/lib/server/interviewer";

const attachmentSchema = z.object({
  id: z.string(),
  kind: z.enum(["text", "audio", "video", "document"]),
  name: z.string(),
  mimeType: z.string(),
  sizeKb: z.number(),
  status: z.enum(["uploaded", "processing", "ready"]),
  transcript: z.string().optional(),
  extractedSignals: z.array(z.string()).optional(),
  storagePath: z.string().optional(),
});

const postSchema = z.object({
  message: z.string().min(1),
  session_id: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
});

type BackendAttachment = {
  id: string;
  kind: "text" | "audio" | "video" | "document";
  name: string;
  mime_type: string;
  size_kb: number;
  status: "uploaded" | "processing" | "ready";
  transcript?: string | null;
  extracted_signals?: string[];
  storage_path?: string | null;
};

type BackendMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
  attachments?: BackendAttachment[];
};

type BackendSession = {
  id: string;
  messages: BackendMessage[];
  progress: number;
  status: "active" | "completed";
  score_update?: unknown;
  phase: string;
};

function mapMessages(messages: BackendMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    attachments: (message.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      name: attachment.name,
      mimeType: attachment.mime_type,
      sizeKb: attachment.size_kb,
      status: attachment.status,
      transcript: attachment.transcript ?? undefined,
      extractedSignals: attachment.extracted_signals ?? [],
      storagePath: attachment.storage_path ?? undefined,
    })),
  }));
}

export async function GET(request: NextRequest) {
  const sessionAuth = getAuthSession(request);
  if (!sessionAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (envFlags.backend) {
    try {
      const data = await backendFetch<{ session: BackendSession }>(
        "/api/v1/interviews/me",
        undefined,
        sessionAuth.sessionId,
      );
      return NextResponse.json({
        session_id: data.session.id,
        messages: mapMessages(data.session.messages),
        progress: data.session.progress,
        status: data.session.status,
        score_update: data.session.score_update ?? null,
        phase: data.session.phase,
        agent: "FastAPI interview backend",
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load interview session" },
        { status: 500 },
      );
    }
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const session = await getOrCreateSession(sessionId, sessionAuth.sessionId, sessionAuth.name);
  return NextResponse.json({
    session_id: sessionId,
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

  if (envFlags.backend) {
    try {
      const data = await backendFetch<{ session: BackendSession }>(
        "/api/v1/interviews/message",
        {
          method: "POST",
          body: JSON.stringify({
            session_id: payload.session_id,
            message: payload.message,
            attachments: (payload.attachments ?? []).map((attachment) => ({
              id: attachment.id,
              kind: attachment.kind,
              name: attachment.name,
              mime_type: attachment.mimeType,
              size_kb: attachment.sizeKb,
              status: attachment.status,
              transcript: attachment.transcript,
              extracted_signals: attachment.extractedSignals ?? [],
              storage_path: attachment.storagePath,
            })),
          }),
        },
        sessionAuth.sessionId,
      );

      const lastAssistant = [...data.session.messages].reverse().find((message) => message.role === "assistant");

      return NextResponse.json({
        session_id: data.session.id,
        reply: lastAssistant?.content ?? "",
        progress: data.session.progress,
        status: data.session.status,
        score_update: data.session.score_update ?? null,
        phase: data.session.phase,
        messages: mapMessages(data.session.messages),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to send interview message" },
        { status: 500 },
      );
    }
  }

  const result = await appendUserMessage(
    payload.session_id,
    sessionAuth.sessionId,
    sessionAuth.name,
    payload.message,
    payload.attachments ?? [],
  );

  return NextResponse.json({
    session_id: payload.session_id,
    reply: result.reply,
    progress: result.progress,
    status: result.status,
    score_update: result.score_update,
    phase: result.phase,
    messages: result.messages,
  });
}
