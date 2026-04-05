import { redactPIIText } from "@/lib/server/security";
import type { ChatAttachment, ChatMessage } from "@/lib/types";

export interface CandidateProfile {
  name?: string;
  city?: string;
  program?: string;
  goals?: string;
  experience?: string;
}

const BASE_QUESTIONS = [
  "Для начала кратко представьтесь и расскажите, из какой среды вы выросли.",
  "Почему вы хотите поступить в inVision U и какой путь хотите пройти после обучения?",
  "Расскажите про ситуацию, где вы взяли инициативу и изменили ход событий.",
  "Опишите проект или достижение, которым вы действительно гордитесь. Что именно сделали вы?",
  "Кейс: в вашей школе или сообществе низкая вовлечённость в общественные проекты. Что вы сделаете за ближайшие 3 месяца?",
];

// ── Build a readable artifact context block for GPT ────────────────────────
function buildArtifactContext(artifacts: ChatAttachment[]): string {
  if (!artifacts.length) return "";

  const lines: string[] = ["SUBMITTED EVIDENCE (files the candidate has attached):"];

  for (const a of artifacts) {
    const kindLabel =
      a.kind === "audio" ? "Voice memo"
      : a.kind === "video" ? "Video"
      : a.mimeType?.startsWith("image/") ? "Photo/image"
      : "Document";

    lines.push(`\n[${kindLabel}] "${a.name}"`);

    if (a.transcript) {
      // Trim to 600 chars to stay within token budget
      const trimmed = a.transcript.slice(0, 600);
      lines.push(`  Transcript/content: ${trimmed}${a.transcript.length > 600 ? "…" : ""}`);
    }

    if (a.extractedSignals?.length) {
      lines.push(`  Key signals: ${a.extractedSignals.slice(0, 6).join(", ")}`);
    }
  }

  return lines.join("\n");
}

async function askOpenAI(
  history: ChatMessage[],
  profile?: CandidateProfile,
  artifacts: ChatAttachment[] = [],
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const transcript = history
    .map((m) => `${m.role === "assistant" ? "INTERVIEWER" : "CANDIDATE"}: ${redactPIIText(m.content)}`)
    .join("\n");

  const profileContext = profile
    ? `Candidate profile:
- Name: ${profile.name || "Unknown"}
- City: ${profile.city || "Unknown"}
- Program applied to: ${profile.program || "inVision U"}
- Stated goals: ${profile.goals || "Not provided"}
- Background/experience: ${profile.experience || "Not provided"}`.trim()
    : "";

  const artifactContext = buildArtifactContext(artifacts);

  const prompt = `You are an expert AI admissions interviewer for inVision U — a selective leadership program in Kazakhstan.

${profileContext}
${artifactContext ? `\n${artifactContext}\n` : ""}
Your role: Ask ONE focused follow-up question based on the candidate's previous answers${artifacts.length ? " AND the evidence they have submitted (files above)" : ""}.

Rules:
- Dig deeper into what they actually said — reference specific details from their responses or uploaded files
- If they submitted a document, voice memo, or video: reference its content explicitly (e.g. "В вашем голосовом сообщении вы упомянули X — расскажите подробнее…" or "В документе, который вы прикрепили, говорится о Y — как это связано с вашими целями?")
- Focus on: leadership potential, genuine motivation, growth mindset, decision-making quality
- If their answer was vague, probe for specifics (names, dates, results)
- If their answer was strong, explore the "why" or challenge their thinking
- Keep the question concise (1-2 sentences max)
- Ask in Russian
- Never reveal scoring or admission outcomes

Interview so far:
${transcript}

Ask the next question only. No preamble.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 180,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// Smooth progress milestones — weighted so initial questions feel faster,
// then slows toward the end (creating a natural sense of deepening engagement).
// count = number of user messages sent so far (AFTER this answer is appended).
const PROGRESS_MILESTONES = [8, 18, 30, 44, 58, 73, 88, 100];

function calcProgress(answeredCount: number): number {
  const idx = Math.min(answeredCount, PROGRESS_MILESTONES.length - 1);
  return PROGRESS_MILESTONES[idx];
}

export async function getAssistantReply(
  history: ChatMessage[],
  profile?: CandidateProfile,
  artifacts: ChatAttachment[] = [],
) {
  const userMessages = history.filter((m) => m.role === "user");
  const count = userMessages.length;

  // Questions 1–5: structured base (personalized via GPT if profile or artifacts available)
  if (count < BASE_QUESTIONS.length) {
    // Use GPT to personalize if we have profile goals OR any artifacts submitted
    const hasContext = (count > 0 && profile?.goals) || artifacts.length > 0;
    if (hasContext) {
      const adaptive = await askOpenAI(history, profile, artifacts);
      if (adaptive) {
        return { reply: adaptive, progress: calcProgress(count), completed: false };
      }
    }
    return {
      reply: BASE_QUESTIONS[count],
      progress: calcProgress(count),
      completed: false,
    };
  }

  // Questions 6–7: fully adaptive GPT follow-up (always uses artifacts)
  if (count < 7) {
    const fallbacks = [
      "Что в вашем прошлом опыте показывает не только результат, но и траекторию роста?",
      "Если бы ваш проект провалился завтра, что именно вы бы пересмотрели в первую очередь и почему?",
    ];
    const adaptive = (await askOpenAI(history, profile, artifacts)) || fallbacks[count - 5];
    return { reply: adaptive, progress: calcProgress(count), completed: false };
  }

  // Completion
  return {
    reply:
      "Спасибо. Интервью завершено. Я зафиксировал ваши ответы и передал результаты на оценку. Итоговое решение принимает только комиссия inVision U.",
    progress: 100,
    completed: true,
  };
}

export function getServiceLabel() {
  return process.env.OPENAI_API_KEY ? "GPT-4o interviewer active" : "Heuristic interviewer active";
}

export function getInterviewMeta(userMessageCount: number) {
  if (userMessageCount < 2) return "Foundation";
  if (userMessageCount < 5) return "Leadership and motivation";
  if (userMessageCount < 7) return "Adaptive deep dive";
  return "Interview completed";
}
