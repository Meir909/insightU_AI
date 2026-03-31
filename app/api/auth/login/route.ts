import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLoginSession, findAccountForLogin } from "@/lib/server/account-store";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
import { verifyPassword } from "@/lib/server/password";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";
import { createAuditLog } from "@/lib/server/prisma";

const loginSchema = z.object({
  role: z.enum(["candidate", "committee", "admin", "viewer"]),
  identifier: z.string().min(3),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const rawPayload = loginSchema.parse(await request.json());
  const payload = sanitizeObject(rawPayload) as z.infer<typeof loginSchema>;
  const account = await findAccountForLogin(payload.role, payload.identifier);

  if (!account || !verifyPassword(payload.password, account.passwordHash)) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Invalid credentials" }, { status: 401 }),
    );
  }

  const persistedSession = await createLoginSession(account.id);

  const session: AuthSession = {
    sessionId: persistedSession.token,
    role: account.role,
    name: account.name,
    email: account.email,
    phone: account.phone,
    entityId: account.entityId,
  };

  await createAuditLog({
    action: "AUTH_LOGIN",
    entityType: "account",
    entityId: account.id,
    actorId: account.id,
    actorType: account.role,
    actorName: account.name,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
    details: {
      role: account.role,
      identifier: payload.identifier,
    },
  });

  const redirectTo = account.role === "candidate" ? "/account" : "/dashboard/account";
  const response = NextResponse.json({ ok: true, redirectTo, session });
  return addSecurityHeaders(applyAuthCookies(response, session));
}
