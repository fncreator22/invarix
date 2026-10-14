import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CLERK_ENABLED } from "@/lib/auth-config";

// Next 16 renamed middleware.ts → proxy.ts (decision F13). Product routes need a session;
// unauthenticated visitors are sent to /sign-in with redirect_url preserved by Clerk.
const isProtected = createRouteMatcher(["/w(.*)", "/onboarding(.*)", "/workspaces(.*)"]);

export default CLERK_ENABLED
  ? clerkMiddleware(
      async (auth, req) => {
        const path = req.nextUrl.pathname;
        // Allow unauthenticated guest exploration of the Northwind Pay live sandbox and proxied API routes
        if (path.startsWith("/w/northwind-pay") || path.startsWith("/api/")) {
          return;
        }
        if (isProtected(req)) await auth.protect();
      },
      { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
    )
  : // No Clerk keys: let pages render so the app is explorable; the API still rejects unauthenticated calls.
    () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
