import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { envFlags } from "@/lib/env";
import { registerCandidateAccount, registerCommitteeAccount } from "@/lib/server/account-store";
import { backendFetch } from "@/lib/server/backend-client";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
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

type BackendAuthResponse = {
  account: {
    role: AuthSession["role"];
    name: string;
    email?: string | null;
    phone?: string | null;
    entity_id: string;
  };
  session: { token: string };
};

export async function POST(request: NextRequest) {
  const payload = registerSchema.parse(await request.json());

  if (envFlags.backend) {
    try {
      const endpoint =
        payload.role === "committee" ? "/api/v1/auth/register/committee" : "/api/v1/auth/register/candidate";
      const backendPayload =
        payload.role === "committee"
          ? {
              role: payload.role,
              name: payload.name.trim(),
              email: payload.email.trim(),
              password: payload.password,
              access_key: payload.accessKey,
            }
          : {
              role: payload.role,
              name: payload.name.trim(),
              email: payload.email?.trim() || null,
              phone: payload.phone.trim(),
              password: payload.password,
            };

      const data = await backendFetch<BackendAuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(backendPayload),
      });

      const session: AuthSession = {
        sessionId: data.session.token,
        role: data.account.role,
        name: data.account.name,
        email: data.account.email ?? undefined,
        phone: data.account.phone ?? undefined,
        entityId: data.account.entity_id,
      };

      const redirectTo = session.role === "committee" ? "/dashboard/account" : "/account";
      const response = NextResponse.json({ ok: true, redirectTo, session });
      return applyAuthCookies(response, session);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to register via backend" },
        { status: 400 },
      );
    }
  }

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
