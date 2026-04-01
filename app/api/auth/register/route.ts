import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerCandidateAccount, registerCommitteeAccount } from "@/lib/server/account-store";
import { applyAuthCookies, type AuthSession } from "@/lib/server/auth";
import { hashPassword } from "@/lib/server/password";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";
import { createAuditLog } from "@/lib/server/prisma";
import { sendCandidateWelcome, sendCommitteeWelcome, notifyCommitteeNewCandidate } from "@/lib/server/email";

const committeeAccessKey = process.env.COMMITTEE_ACCESS_KEY || "committee-demo";

const candidateSchema = z.object({
  role: z.literal("candidate"),
  name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().regex(/^\+7\d{10}$/, "Use Kazakhstan format: +7XXXXXXXXXX"),
  password: z.string().min(8).max(128),
  acceptedLegal: z.literal(true),
});

const committeeSchema = z.object({
  role: z.literal("committee"),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  accessKey: z.string().min(4),
  acceptedLegal: z.literal(true),
});

const registerSchema = z.discriminatedUnion("role", [candidateSchema, committeeSchema]);

export async function POST(request: NextRequest) {
  let rawPayload: z.infer<typeof registerSchema>;
  try {
    const body = await request.json();
    rawPayload = registerSchema.parse(body);
  } catch (err) {
    const message = err instanceof z.ZodError
      ? err.errors.map((e) => e.message).join("; ")
      : "Invalid request data";
    return addSecurityHeaders(
      NextResponse.json({ error: message }, { status: 400 })
    );
  }

  const payload = sanitizeObject(rawPayload) as z.infer<typeof registerSchema>;

  if (payload.role === "committee" && payload.accessKey !== committeeAccessKey) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Неверный код доступа комиссии" }, { status: 401 }),
    );
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

    await createAuditLog({
      action: "AUTH_REGISTER",
      entityType: "account",
      entityId: session.entityId || account.id,
      actorId: account.id,
      actorType: account.role,
      actorName: account.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        role: account.role,
        email: account.email,
        phone: account.phone,
        acceptedLegal: true,
      },
    });

    // Fire-and-forget emails (don't block the response)
    if (account.role === "candidate") {
      void sendCandidateWelcome({
        name: account.name,
        email: account.email,
        phone: account.phone,
        code: account.entityId ?? account.id,
      });
      void notifyCommitteeNewCandidate({
        candidateName: account.name,
        candidateCode: account.entityId ?? account.id,
      });
    } else {
      void sendCommitteeWelcome({
        name: account.name,
        email: account.email ?? "",
      });
    }

    return addSecurityHeaders(applyAuthCookies(response, session));
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to register account" },
        { status: 400 },
      ),
    );
  }
}
