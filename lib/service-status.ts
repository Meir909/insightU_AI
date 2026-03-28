import { env, envFlags } from "@/lib/env";

export type ServiceState = {
  key: string;
  label: string;
  configured: boolean;
  detail: string;
};

export function getServiceStatus(): ServiceState[] {
  return [
    {
      key: "auth",
      label: "Built-in Auth",
      configured: true,
      detail: envFlags.committeeAccessKey ? "Committee access key configured" : "Using default committee-demo key",
    },
    {
      key: "dashboard",
      label: "Dashboard Data Layer",
      configured: envFlags.api,
      detail: env.NEXT_PUBLIC_API_BASE_URL || "Using mock ranking fallback",
    },
    {
      key: "llm",
      label: "OpenAI GPT-4o",
      configured: envFlags.openai,
      detail: envFlags.openai ? "OPENAI_API_KEY present" : "Missing OPENAI_API_KEY",
    },
    {
      key: "chat",
      label: "Web Chat Agent",
      configured: true,
      detail: "Session-based interviewer is available via /api/chat",
    },
  ];
}
