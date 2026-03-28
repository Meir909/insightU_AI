import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_WS_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  POSTGRES_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  FAISS_API_URL: z.string().url().optional().or(z.literal("")),
  S3_BUCKET_URL: z.string().url().optional().or(z.literal("")),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  POSTGRES_URL: process.env.POSTGRES_URL,
  REDIS_URL: process.env.REDIS_URL,
  FAISS_API_URL: process.env.FAISS_API_URL,
  S3_BUCKET_URL: process.env.S3_BUCKET_URL,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

export const envFlags = {
  api: Boolean(env.NEXT_PUBLIC_API_BASE_URL),
  realtime: Boolean(env.NEXT_PUBLIC_WS_URL),
  clerk: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY),
  openai: Boolean(env.OPENAI_API_KEY),
  postgres: Boolean(env.POSTGRES_URL),
  redis: Boolean(env.REDIS_URL),
  faiss: Boolean(env.FAISS_API_URL),
  s3: Boolean(env.S3_BUCKET_URL),
};
