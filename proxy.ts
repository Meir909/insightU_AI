import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROLE_COOKIE, AUTH_SESSION_COOKIE, hasBackofficeAccess } from "@/lib/server/auth";

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionId = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE)?.value;

  // /admin is local-only — block in production
  if (pathname.startsWith("/admin")) {
    const host = request.headers.get("host") || "";
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    if (!isLocal) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!sessionId || !hasBackofficeAccess(role)) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  if (pathname.startsWith("/account")) {
    if (!sessionId || role !== "candidate") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  if (pathname.startsWith("/interview")) {
    if (!sessionId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  if (pathname.startsWith("/api/chat") || pathname.startsWith("/api/committee")) {
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
