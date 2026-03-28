import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROLE_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/server/auth";

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionId = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE)?.value;

  if (pathname.startsWith("/dashboard")) {
    if (!sessionId || role !== "committee") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  if (pathname.startsWith("/interview")) {
    if (!sessionId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  if (pathname.startsWith("/api/chat")) {
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
