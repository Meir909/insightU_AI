import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  BACKEND_API_URL: z.string().url().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional(),
  COMMITTEE_ACCESS_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  COMMITTEE_ACCESS_KEY: process.env.COMMITTEE_ACCESS_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

export const envFlags = {
  api: Boolean(env.NEXT_PUBLIC_API_BASE_URL),
  backend: Boolean(env.BACKEND_API_URL),
  openai: Boolean(env.OPENAI_API_KEY),
  committeeAccessKey: Boolean(env.COMMITTEE_ACCESS_KEY),
  supabase: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
};
