import { randomUUID } from "crypto";
import type { ChatMessage, InterviewScoreUpdate } from "@/lib/types";
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
};

const sessions = new Map<string, SessionState>();

const makeMessage = (role: "assistant" | "user", content: string): ChatMessage => ({
  id: randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
});

export async function getOrCreateSession(sessionId: string, userId: string) {
  const existing = sessions.get(sessionId);
  if (existing) {
    if (existing.userId !== userId) {
      throw new Error("Session does not belong to this user.");
    }
    return existing;
  }

  const greeting = makeMessage(
    "assistant",
    "Здравствуйте. Я AI interviewer InsightU. Я задам несколько вопросов, чтобы понять ваш путь, мотивацию и лидерский потенциал. Итоговое решение остаётся за комиссией.",
  );

  const firstQuestion = makeMessage(
    "assistant",
    "Для начала кратко представьтесь и расскажите, из какой среды вы выросли.",
  );

  const session: SessionState = {
    sessionId,
    userId,
    messages: [greeting, firstQuestion],
    progress: 12,
    status: "active",
    scoreUpdate: null,
    phase: "Foundation",
  };

  sessions.set(sessionId, session);
  return session;
}

export async function appendUserMessage(sessionId: string, userId: string, content: string) {
  const session = await getOrCreateSession(sessionId, userId);
  session.messages.push(makeMessage("user", content));

  const userMessages = session.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  session.scoreUpdate = scoreInterview(userMessages);

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
