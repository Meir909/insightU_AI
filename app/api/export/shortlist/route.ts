import { NextResponse } from "next/server";
import { addSecurityHeaders } from "@/lib/server/security";
import { getShortlist } from "@/lib/api";
import {
  AUTH_ENTITY_COOKIE,
  AUTH_EMAIL_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  parseAuthSession,
} from "@/lib/server/auth";
import { cookies } from "next/headers";

const DECISION_LABEL: Record<string, string> = {
  approved: "Одобрен",
  rejected: "Отклонён",
  escalated: "На эскалации",
  pending: "Ожидает",
};

export async function GET() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!session || !["committee", "admin", "viewer"].includes(session.role)) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Доступ запрещён" }, { status: 403 }),
    );
  }

  const shortlist = await getShortlist();

  const rows: string[] = [
    [
      "Ранг",
      "Код",
      "Имя",
      "Город",
      "Программа",
      "Итоговый балл",
      "Уверенность %",
      "AI риск %",
      "Статус",
      "Обоснование AI",
      "Решение комиссии",
      "Голосов за",
      "Всего голосов",
    ]
      .map((h) => `"${h}"`)
      .join(","),
  ];

  shortlist.forEach((c, idx) => {
    const rank = idx + 1;
    const confidence = Math.round(c.confidence * 100);
    const aiRisk = Math.round(c.ai_detection_prob * 100);
    const decision = DECISION_LABEL[c.committee_review?.finalDecision ?? "pending"] ?? "Ожидает";
    const approvedVotes = c.committee_review?.approvedCount ?? 0;
    const totalVotes = c.committee_review?.votes?.length ?? 0;
    const reasoning = (c.reasoning ?? "").replace(/"/g, '""');

    rows.push(
      [
        rank,
        `"${c.code}"`,
        `"${c.name}"`,
        `"${c.city}"`,
        `"${c.program}"`,
        c.final_score.toFixed(1),
        confidence,
        aiRisk,
        `"${c.status}"`,
        `"${reasoning}"`,
        `"${decision}"`,
        approvedVotes,
        totalVotes,
      ].join(","),
    );
  });

  const csv = "\uFEFF" + rows.join("\r\n"); // BOM for Excel UTF-8
  const date = new Date().toISOString().slice(0, 10);

  return addSecurityHeaders(
    new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invisionu-shortlist-${date}.csv"`,
      },
    }),
  );
}
