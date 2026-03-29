import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getAuthSession,
} from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    session,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAuthCookies(response);
}
