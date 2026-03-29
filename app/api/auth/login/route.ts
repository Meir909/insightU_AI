import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { envFlags } from "@/lib/env";
import { findAccountForLogin } from "@/lib/server/account-store";
import { backendFetch } from "@/lib/server/backend-client";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
import { verifyPassword } from "@/lib/server/password";

const loginSchema = z.object({
  role: z.enum(["candidate", "committee"]),
  identifier: z.string().min(3),
  password: z.string().min(8).max(128),
});

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
  const payload = loginSchema.parse(await request.json());

  if (envFlags.backend) {
    try {
      const data = await backendFetch<BackendAuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
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
        { error: error instanceof Error ? error.message : "Failed to login via backend" },
        { status: 401 },
      );
    }
  }

  const account = await findAccountForLogin(payload.role, payload.identifier);

  if (!account || !verifyPassword(payload.password, account.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

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
}
