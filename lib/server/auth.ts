import { randomUUID } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const AUTH_SESSION_COOKIE = "insightu_session";
export const AUTH_ROLE_COOKIE = "insightu_role";
export const AUTH_NAME_COOKIE = "insightu_name";
export const AUTH_EMAIL_COOKIE = "insightu_email";
export const AUTH_PHONE_COOKIE = "insightu_phone";
export const AUTH_ENTITY_COOKIE = "insightu_entity";

export type AuthRole = "candidate" | "committee";

export type AuthSession = {
  sessionId: string;
  role: AuthRole;
  name: string;
  email?: string;
  phone?: string;
  entityId?: string;
};

const cookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24,
};

const clean = (value?: string | null) => value?.trim() || undefined;

export function createSessionId() {
  return randomUUID();
}

export function getAuthSession(request: NextRequest): AuthSession | null {
  const sessionId = clean(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
  const role = clean(request.cookies.get(AUTH_ROLE_COOKIE)?.value) as AuthRole | undefined;
  const name = clean(request.cookies.get(AUTH_NAME_COOKIE)?.value);

  if (!sessionId || !role || !name) {
    return null;
  }

  if (role !== "candidate" && role !== "committee") {
    return null;
  }

  return {
    sessionId,
    role,
    name,
    email: clean(request.cookies.get(AUTH_EMAIL_COOKIE)?.value),
    phone: clean(request.cookies.get(AUTH_PHONE_COOKIE)?.value),
    entityId: clean(request.cookies.get(AUTH_ENTITY_COOKIE)?.value),
  };
}

export function applyAuthCookies(response: NextResponse, session: AuthSession) {
  response.cookies.set(AUTH_SESSION_COOKIE, session.sessionId, cookieOptions);
  response.cookies.set(AUTH_ROLE_COOKIE, session.role, cookieOptions);
  response.cookies.set(AUTH_NAME_COOKIE, session.name, cookieOptions);
  response.cookies.set(AUTH_EMAIL_COOKIE, session.email || "", cookieOptions);
  response.cookies.set(AUTH_PHONE_COOKIE, session.phone || "", cookieOptions);
  response.cookies.set(AUTH_ENTITY_COOKIE, session.entityId || "", cookieOptions);
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_ROLE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_NAME_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_EMAIL_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_PHONE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(AUTH_ENTITY_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
