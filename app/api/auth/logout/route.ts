import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(`${origin}/sign-in`);
  return addSecurityHeaders(clearAuthCookies(response));
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(`${origin}/sign-in`);
  return addSecurityHeaders(clearAuthCookies(response));
}
