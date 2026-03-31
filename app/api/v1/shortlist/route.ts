import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { getShortlist } from "@/lib/api";

function toCsv(rows: Awaited<ReturnType<typeof getShortlist>>) {
  const header = ["code", "name", "city", "status", "final_score", "confidence"];
  const body = rows.map((candidate) =>
    [
      candidate.code,
      candidate.name,
      candidate.city,
      candidate.status,
      candidate.final_score,
      candidate.confidence,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session || !hasBackofficeAccess(session.role)) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const shortlist = await getShortlist();
  const format = request.nextUrl.searchParams.get("format");

  if (format === "csv") {
    const response = new NextResponse(toCsv(shortlist), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="insightu-shortlist.csv"',
      },
    });
    return addSecurityHeaders(response);
  }

  return addSecurityHeaders(
    NextResponse.json({
      shortlisted: shortlist,
      count: shortlist.length,
    }),
  );
}
