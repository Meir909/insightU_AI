import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional(),
  COMMITTEE_ACCESS_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  COMMITTEE_ACCESS_KEY: process.env.COMMITTEE_ACCESS_KEY,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

export const envFlags = {
  api: Boolean(env.NEXT_PUBLIC_API_BASE_URL),
  openai: Boolean(env.OPENAI_API_KEY),
  committeeAccessKey: Boolean(env.COMMITTEE_ACCESS_KEY),
};
