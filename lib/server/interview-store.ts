import { randomUUID } from "crypto";
import type { ChatAttachment, ChatMessage } from "@/lib/types";
import { getAssistantReply, getInterviewMeta } from "@/lib/server/interviewer";
import { scoreInterview } from "@/lib/server/interview-scoring";
import { detectAIContent } from "@/lib/services/ai-detector";
import {
  addInterviewMessage,
  getCandidateById,
  getAuthenticatedAccountByToken,
  getInterviewSessionByCandidateId,
  updateInterviewProgress,
} from "@/lib/server/prisma";

type SessionState = {
  sessionId: string;
  userId: string;
  candidateName: string;
  messages: ChatMessage[];
  progress: number;
  status: "active" | "completed";
  scoreUpdate: ReturnType<typeof scoreInterview> | null;
  phase: string;
  artifacts: ChatAttachment[];
};

const makeMessage = (role: "assistant" | "user", content: string, attachments?: ChatAttachment[]): ChatMessage => ({
  id: randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
  attachments,
});

const seedMessages = (): ChatMessage[] => [
  makeMessage(
    "assistant",
    "Здравствуйте. Я AI interviewer InsightU. Я задам несколько вопросов, чтобы понять ваш путь, мотивацию и лидерский потенциал. Итоговое решение всегда остаётся за комиссией.",
  ),
  makeMessage(
    "assistant",
    "Для начала кратко представьтесь и расскажите, из какой среды вы выросли. Вы также можете прикрепить voice, video или document evidence.",
  ),
];

function summarizeAttachments(attachments: ChatAttachment[]) {
  return attachments
    .map((item) => `${item.kind}: ${item.name}${item.transcript ? ` | ${item.transcript}` : ""}`)
    .join("\n");
}

async function loadArtifacts(candidateId: string): Promise<ChatAttachment[]> {
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return [];
  }

  return candidate.artifacts.map((artifact) => {
    const analysis =
      artifact.analysis && typeof artifact.analysis === "object"
        ? (artifact.analysis as { transcript?: string; keyPoints?: string[] })
        : undefined;

    return {
      id: artifact.id,
      kind: artifact.type === "image" ? "document" : (artifact.type as ChatAttachment["kind"]),
      name: artifact.name,
      mimeType: artifact.mimeType || "application/octet-stream",
      sizeKb: Math.max(1, Math.round(artifact.size / 1024)),
      status: "ready",
      transcript: analysis?.transcript,
      extractedSignals: analysis?.keyPoints || [],
      storagePath: artifact.url,
    };
  });
}

async function resolveCandidateFromSessionToken(sessionToken: string) {
  const persistedSession = await getAuthenticatedAccountByToken(sessionToken);
  return persistedSession?.account.candidate ?? null;
}

export async function getOrCreateSession(_requestedSessionId: string, userId: string, candidateName = "Candidate") {
  const candidate = await resolveCandidateFromSessionToken(userId);
  if (!candidate) {
    throw new Error("Candidate profile not found for this session.");
  }

  const persisted = await getInterviewSessionByCandidateId(candidate.id);
  if (!persisted) {
    throw new Error("Interview session not initialized for candidate.");
  }

  let messages: ChatMessage[] = persisted.messages.map((message) => ({
    id: message.id,
    role: message.role === "system" ? "assistant" : message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  if (messages.length === 0) {
    messages = seedMessages();
    for (const message of messages) {
      await addInterviewMessage({
        sessionId: persisted.id,
        role: message.role,
        content: message.content,
      });
    }
  }

  return {
    sessionId: persisted.id,
    userId,
    candidateName: candidate.fullName || candidateName,
    messages,
    progress: persisted.progress,
    status: persisted.status === "completed" ? "completed" : "active",
    scoreUpdate: persisted.messages.findLast((item) => item.scoreUpdate)?.scoreUpdate as ReturnType<typeof scoreInterview> | null,
    phase: persisted.phase,
    artifacts: await loadArtifacts(candidate.id),
  } satisfies SessionState;
}

export async function appendUserMessage(
  sessionId: string,
  userId: string,
  candidateName: string,
  content: string,
  attachments: ChatAttachment[] = [],
) {
  const session = await getOrCreateSession(sessionId, userId, candidateName);
  const contentWithArtifacts =
    attachments.length > 0 ? `${content}\n\n[Attached evidence]\n${summarizeAttachments(attachments)}` : content;

  await addInterviewMessage({
    sessionId: session.sessionId,
    role: "user",
    content: contentWithArtifacts,
    scoreUpdate: null,
  });

  const userMessages = [...session.messages.filter((message) => message.role === "user").map((message) => message.content), contentWithArtifacts];
  const allArtifacts = [...session.artifacts, ...attachments];
  const scoreUpdate = scoreInterview(userMessages, allArtifacts);

  const assistant = await getAssistantReply([
    ...session.messages,
    makeMessage("user", contentWithArtifacts, attachments),
  ]);

  await addInterviewMessage({
    sessionId: session.sessionId,
    role: "assistant",
    content: assistant.reply,
    scoreUpdate,
  });

  await updateInterviewProgress(session.sessionId, assistant.progress, getInterviewMeta(userMessages.length), {
    cognitiveScore: scoreUpdate.cognitive,
    leadershipScore: scoreUpdate.leadership,
    growthScore: scoreUpdate.growth,
    decisionScore: scoreUpdate.decision,
    motivationScore: scoreUpdate.motivation,
    authenticityScore: scoreUpdate.authenticity,
    confidenceScore: scoreUpdate.confidence * 100,
    aiRiskScore: scoreUpdate.ai_detection_prob * 100,
    status: assistant.completed ? "completed" : "active",
  });

  // On interview completion: run full LLM-based AI detection async (does not block response)
  if (assistant.completed) {
    const pureUserMessages = userMessages.filter((m) => !m.startsWith("[Attached evidence]"));
    detectAIContent(pureUserMessages).then(async (detection) => {
      // Override aiRiskScore with LLM-enhanced result
      await updateInterviewProgress(session.sessionId, 100, undefined, {
        aiRiskScore: Math.round(detection.probability * 100),
      });
    }).catch((err) => {
      console.error("[interview-store] LLM AI detection failed:", err);
    });
  }

  const refreshed = await getOrCreateSession(session.sessionId, userId, session.candidateName);

  return {
    reply: assistant.reply,
    progress: assistant.progress,
    status: assistant.completed ? "completed" : "active",
    score_update: scoreUpdate,
    messages: refreshed.messages,
    phase: getInterviewMeta(userMessages.length),
    session_id: session.sessionId,
  };
}
