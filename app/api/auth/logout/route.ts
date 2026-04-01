import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return addSecurityHeaders(clearAuthCookies(response));
}
