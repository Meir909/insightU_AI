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
      label: "Clerk Auth",
      configured: envFlags.clerk,
      detail: envFlags.clerk ? "Publishable + secret key present" : "Missing Clerk keys",
    },
    {
      key: "api",
      label: "FastAPI",
      configured: envFlags.api,
      detail: env.NEXT_PUBLIC_API_BASE_URL || "Missing NEXT_PUBLIC_API_BASE_URL",
    },
    {
      key: "realtime",
      label: "WebSocket",
      configured: envFlags.realtime,
      detail: env.NEXT_PUBLIC_WS_URL || "Missing NEXT_PUBLIC_WS_URL",
    },
    {
      key: "llm",
      label: "OpenAI GPT-4o",
      configured: envFlags.openai,
      detail: envFlags.openai ? "OPENAI_API_KEY present" : "Missing OPENAI_API_KEY",
    },
    {
      key: "postgres",
      label: "PostgreSQL",
      configured: envFlags.postgres,
      detail: envFlags.postgres ? "POSTGRES_URL present" : "Missing POSTGRES_URL",
    },
    {
      key: "redis",
      label: "Redis Cache",
      configured: envFlags.redis,
      detail: envFlags.redis ? "REDIS_URL present" : "Missing REDIS_URL",
    },
    {
      key: "faiss",
      label: "FAISS / Vector DB",
      configured: envFlags.faiss,
      detail: env.FAISS_API_URL || "Missing FAISS_API_URL",
    },
    {
      key: "storage",
      label: "S3 Storage",
      configured: envFlags.s3,
      detail: env.S3_BUCKET_URL || "Missing S3_BUCKET_URL",
    },
  ];
}
