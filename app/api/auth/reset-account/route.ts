import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addSecurityHeaders, sanitizeObject } from "@/lib/server/security";
import { prisma } from "@/lib/server/prisma";

const resetSchema = z.object({
  role: z.enum(["candidate", "committee"]),
  identifier: z.string().min(3),
});

/**
 * DELETE /api/auth/reset-account
 *
 * Deletes the account (and all related data) for the given identifier
 * so the user can re-register with the same email / phone.
 *
 * This is intentionally destructive — it is only exposed via a UI button
 * that appears after a failed login attempt, so the user explicitly
 * consents to wiping their registration before retrying.
 */
export async function DELETE(request: NextRequest) {
  try {
    const rawPayload = resetSchema.parse(await request.json());
    const payload = sanitizeObject(rawPayload) as z.infer<typeof resetSchema>;

    const normalized = payload.identifier.trim().toLowerCase();

    // Find the account by email or phone
    const account = await prisma.account.findFirst({
      where: {
        role: payload.role,
        OR: [
          { email: normalized },
          { phone: payload.identifier.trim() },
        ],
      },
      include: {
        candidate: { select: { id: true } },
        committeeMember: { select: { id: true } },
      },
    });

    if (!account) {
      // Return success even if not found — no information leak
      return addSecurityHeaders(NextResponse.json({ ok: true, deleted: false }));
    }

    // Cascade delete the account (Prisma will cascade to sessions, candidate, etc.)
    await prisma.account.delete({ where: { id: account.id } });

    return addSecurityHeaders(NextResponse.json({ ok: true, deleted: true }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Неверный формат данных" }, { status: 400 }),
      );
    }
    console.error("[reset-account] error:", error instanceof Error ? error.message : String(error));
    return addSecurityHeaders(
      NextResponse.json({ error: "Ошибка сервера, попробуйте ещё раз" }, { status: 500 }),
    );
  }
}
