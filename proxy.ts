import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { envFlags } from "@/lib/env";

const isProtected = createRouteMatcher(["/dashboard(.*)", "/interview(.*)", "/api/chat(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!envFlags.clerk) {
    return;
  }

  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
