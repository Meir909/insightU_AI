import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
import { registerCandidateAccount, registerCommitteeAccount } from "@/lib/server/account-store";
import { hashPassword } from "@/lib/server/password";

const committeeAccessKey = process.env.COMMITTEE_ACCESS_KEY || "committee-demo";

const candidateSchema = z.object({
  role: z.literal("candidate"),
  name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().regex(/^\+7\d{10}$/, "Use Kazakhstan format: +7XXXXXXXXXX"),
  password: z.string().min(8).max(128),
});

const committeeSchema = z.object({
  role: z.literal("committee"),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  accessKey: z.string().min(4),
});

const registerSchema = z.discriminatedUnion("role", [candidateSchema, committeeSchema]);

export async function POST(request: NextRequest) {
  const payload = registerSchema.parse(await request.json());

  if (payload.role === "committee" && payload.accessKey !== committeeAccessKey) {
    return NextResponse.json({ error: "Invalid committee access key" }, { status: 401 });
  }

  try {
    const passwordHash = hashPassword(payload.password);
    const account =
      payload.role === "candidate"
        ? await registerCandidateAccount({
            name: payload.name.trim(),
            email: payload.email?.trim() || undefined,
            phone: payload.phone.trim(),
            passwordHash,
          })
        : await registerCommitteeAccount({
            name: payload.name.trim(),
            email: payload.email.trim(),
            passwordHash,
          });

    const session: AuthSession = {
      sessionId: account.id,
      role: account.role,
      name: account.name,
      email: account.email,
      phone: account.phone,
      entityId: account.entityId,
    };

    const redirectTo = account.role === "committee" ? "/dashboard/account" : "/account";
    const response = NextResponse.json({ ok: true, redirectTo, session });
    return applyAuthCookies(response, session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register account" },
      { status: 400 },
    );
  }
}
