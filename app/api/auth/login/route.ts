import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAccountForLogin } from "@/lib/server/account-store";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
import { verifyPassword } from "@/lib/server/password";

const loginSchema = z.object({
  role: z.enum(["candidate", "committee"]),
  identifier: z.string().min(3),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const payload = loginSchema.parse(await request.json());
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
