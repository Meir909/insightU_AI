import { z } from "zod";

const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  
  // Database
  DATABASE_URL: z.string().optional(),
  
  // AI
  OPENAI_API_KEY: z.string().optional(),
  
  // File Storage (S3)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_PREFIX: z.string().optional(),
  
  // Email
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // Auth
  SESSION_SECRET: z.string().optional(),
  COMMITTEE_ACCESS_KEY: z.string().optional(),
  
  // Legacy (for migration)
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  BACKEND_API_URL: z.string().url().optional().or(z.literal("")),
});

const parsed = envSchema.safeParse({
  // App
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // AI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_PREFIX: process.env.S3_PREFIX,
  
  // Email
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL,
  
  // Auth
  SESSION_SECRET: process.env.SESSION_SECRET,
  COMMITTEE_ACCESS_KEY: process.env.COMMITTEE_ACCESS_KEY,
  
  // Legacy
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  BACKEND_API_URL: process.env.BACKEND_API_URL,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

export const envFlags = {
  // App
  app: Boolean(env.NEXT_PUBLIC_APP_URL),
  api: Boolean(env.NEXT_PUBLIC_API_BASE_URL),
  
  // Database
  database: Boolean(env.DATABASE_URL),
  
  // AI
  openai: Boolean(env.OPENAI_API_KEY),
  
  // Storage
  s3: Boolean(env.AWS_ACCESS_KEY_ID && env.S3_BUCKET_NAME),
  
  // Email
  email: Boolean(env.RESEND_API_KEY),
  
  // Auth
  sessionSecret: Boolean(env.SESSION_SECRET),
  committeeAccessKey: Boolean(env.COMMITTEE_ACCESS_KEY),
  
  // Legacy
  supabase: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  backend: Boolean(env.BACKEND_API_URL),
};
