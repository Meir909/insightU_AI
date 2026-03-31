import { envFlags } from "@/lib/env";
import { redactPIIText } from "@/lib/server/security";
import type { ChatMessage } from "@/lib/types";

const structuredQuestions = [
  "Для начала кратко представьтесь и расскажите, из какой среды вы выросли.",
  "Почему вы хотите поступить в inVision U и какой путь хотите пройти после обучения?",
  "Расскажите про ситуацию, где вы взяли инициативу и изменили ход событий.",
  "Опишите проект или достижение, которым вы действительно гордитесь. Что именно сделали вы?",
  "Кейс: в вашей школе или сообществе низкая вовлечённость в общественные проекты. Что вы сделаете за ближайшие 3 месяца?",
];

async function askOpenAI(history: ChatMessage[]) {
  if (!process.env.OPENAI_API_KEY) return null;

  const transcript = history
    .map((message) => `${message.role.toUpperCase()}: ${redactPIIText(message.content)}`)
    .join("\n");

  const prompt = `You are an AI admissions interviewer for inVision U.
You must ask one concise next interview question only.
Focus on leadership potential, motivation, growth path and explainability.
Never give admission results to the candidate.
Current transcript:
${transcript}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      input: prompt,
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { output_text?: string };
  return data.output_text?.trim() || null;
}

export async function getAssistantReply(history: ChatMessage[]) {
  const userMessages = history.filter((message) => message.role === "user");

  if (userMessages.length < structuredQuestions.length) {
    return {
      reply: structuredQuestions[userMessages.length],
      progress: Math.round(((userMessages.length + 1) / 7) * 100),
      completed: false,
    };
  }

  if (userMessages.length < 7) {
    const adaptive =
      (await askOpenAI(history)) ||
      (userMessages.length === 5
        ? "Что в вашем прошлом опыте показывает не только результат, но и траекторию роста?"
        : "Если бы ваш проект провалился завтра, что именно вы бы пересмотрели в первую очередь и почему?");

    return {
      reply: adaptive,
      progress: Math.round(((userMessages.length + 1) / 7) * 100),
      completed: false,
    };
  }

  return {
    reply:
      "Спасибо. Интервью завершено. Я зафиксировал ваши ответы и обновил промежуточную оценку для комиссии. Итоговое решение будет принимать только комиссия inVision U.",
    progress: 100,
    completed: true,
  };
}

export function getServiceLabel() {
  return envFlags.openai ? "OpenAI interviewer active" : "Heuristic interviewer active";
}

export function getInterviewMeta(userMessageCount: number) {
  if (userMessageCount < 2) return "Foundation";
  if (userMessageCount < 5) return "Leadership and motivation";
  if (userMessageCount < 7) return "Adaptive deep dive";
  return "Interview completed";
}
