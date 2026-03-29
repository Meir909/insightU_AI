import { randomUUID } from "crypto";
import type { ChatAttachment, ChatMessage, InterviewScoreUpdate } from "@/lib/types";
import { getAssistantReply, getInterviewMeta } from "@/lib/server/interviewer";
import { scoreInterview } from "@/lib/server/interview-scoring";

type SessionState = {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  progress: number;
  status: "active" | "completed";
  scoreUpdate: InterviewScoreUpdate | null;
  phase: string;
  artifacts: ChatAttachment[];
};

const sessions = new Map<string, SessionState>();

const makeMessage = (role: "assistant" | "user", content: string, attachments?: ChatAttachment[]): ChatMessage => ({
  id: randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
  attachments,
});

const summarizeAttachments = (attachments: ChatAttachment[]) =>
  attachments
    .map((item) => `${item.kind}: ${item.name}${item.transcript ? ` | ${item.transcript}` : ""}`)
    .join("\n");

export async function getOrCreateSession(sessionId: string, userId: string) {
  const existing = sessions.get(sessionId);
  if (existing) {
    if (existing.userId !== userId) {
      throw new Error("Session does not belong to this user.");
    }
    return existing;
  }

  const session: SessionState = {
    sessionId,
    userId,
    messages: [
      makeMessage(
        "assistant",
        "Здравствуйте. Я AI interviewer InsightU. Я задам несколько вопросов, чтобы понять ваш путь, мотивацию и лидерский потенциал. Итоговое решение остаётся за комиссией.",
      ),
      makeMessage(
        "assistant",
        "Для начала кратко представьтесь и расскажите, из какой среды вы выросли. Вы также можете прикрепить voice, video или document evidence.",
      ),
    ],
    progress: 12,
    status: "active",
    scoreUpdate: null,
    phase: "Foundation",
    artifacts: [],
  };

  sessions.set(sessionId, session);
  return session;
}

export async function appendUserMessage(
  sessionId: string,
  userId: string,
  content: string,
  attachments: ChatAttachment[] = [],
) {
  const session = await getOrCreateSession(sessionId, userId);
  session.artifacts.push(...attachments);

  const contentWithArtifacts =
    attachments.length > 0
      ? `${content}\n\n[Attached evidence]\n${summarizeAttachments(attachments)}`
      : content;

  session.messages.push(makeMessage("user", contentWithArtifacts, attachments));

  const userMessages = session.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  session.scoreUpdate = scoreInterview(userMessages, session.artifacts);

  const assistant = await getAssistantReply(session.messages);
  session.messages.push(makeMessage("assistant", assistant.reply));
  session.progress = assistant.progress;
  session.status = assistant.completed ? "completed" : "active";
  session.phase = getInterviewMeta(userMessages.length);

  return {
    reply: assistant.reply,
    progress: session.progress,
    status: session.status,
    score_update: session.scoreUpdate,
    messages: session.messages,
    phase: session.phase,
  };
}
