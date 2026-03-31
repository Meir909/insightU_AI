import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLoginSession, findAccountForLogin } from "@/lib/server/account-store";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
import { verifyPassword } from "@/lib/server/password";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";
import { createAuditLog } from "@/lib/server/prisma";

const loginSchema = z.object({
  role: z.enum(["candidate", "committee"]),
  identifier: z.string().min(3),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const rawPayload = loginSchema.parse(await request.json());
    const payload = sanitizeObject(rawPayload) as z.infer<typeof loginSchema>;

    // Run account lookup and session creation without blocking on audit log
    const account = await findAccountForLogin(payload.role, payload.identifier);

    if (!account || !verifyPassword(payload.password, account.passwordHash)) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 }),
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

    const redirectTo = account.role === "candidate" ? "/account" : "/dashboard";
    const response = NextResponse.json({ ok: true, redirectTo, session });
    const finalResponse = addSecurityHeaders(applyAuthCookies(response, session));

    // Audit log is fire-and-forget — does not block login response
    createAuditLog({
      action: "AUTH_LOGIN",
      entityType: "account",
      entityId: account.id,
      actorId: account.id,
      actorType: account.role,
      actorName: account.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: { role: account.role },
    }).catch(() => {});

    return finalResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Неверный формат данных" }, { status: 400 }),
      );
    }
    console.error("[login] Unhandled error:", error instanceof Error ? error.message : String(error));
    return addSecurityHeaders(
      NextResponse.json({ error: "Ошибка сервера, попробуйте ещё раз" }, { status: 500 }),
    );
  }
}
