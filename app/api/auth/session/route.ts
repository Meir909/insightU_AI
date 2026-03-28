import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  applyAuthCookies,
  clearAuthCookies,
  createSessionId,
  getAuthSession,
  type AuthSession,
} from "@/lib/server/auth";

const committeeAccessKey = process.env.COMMITTEE_ACCESS_KEY || "committee-demo";

const candidateSchema = z.object({
  role: z.literal("candidate"),
  name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+7\d{10}$/, "Use Kazakhstan format: +7XXXXXXXXXX"),
});

const committeeSchema = z.object({
  role: z.literal("committee"),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  accessKey: z.string().min(4),
});

const authSchema = z.discriminatedUnion("role", [candidateSchema, committeeSchema]);

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    session,
  });
}

export async function POST(request: NextRequest) {
  const payload = authSchema.parse(await request.json());

  if (payload.role === "committee" && payload.accessKey !== committeeAccessKey) {
    return NextResponse.json({ error: "Invalid access key" }, { status: 401 });
  }

  const session: AuthSession = {
    sessionId: createSessionId(),
    role: payload.role,
    name: payload.name.trim(),
    email: payload.email?.trim() || undefined,
    phone: payload.role === "candidate" ? payload.phone.trim() : undefined,
  };

  const redirectTo = payload.role === "committee" ? "/dashboard" : "/interview";
  const response = NextResponse.json({
    ok: true,
    redirectTo,
    session,
  });

  return applyAuthCookies(response, session);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAuthCookies(response);
}
