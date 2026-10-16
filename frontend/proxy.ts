import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { CLERK_ENABLED } from "@/lib/auth-config";

// Next 16 renamed middleware.ts → proxy.ts (decision F13). Product routes need a session;
// unauthenticated visitors are sent to /sign-in with redirect_url preserved by Clerk.
const isProtected = createRouteMatcher(["/w(.*)", "/onboarding(.*)", "/workspaces(.*)"]);

export default CLERK_ENABLED
  ? clerkMiddleware(
      async (auth, req) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/w/")) {
          const parts = path.split("/");
          if (parts[2]) {
            const rawSlug = parts[2];
            const normalizedSlug = decodeURIComponent(rawSlug).trim().toLowerCase().replace(/\s+/g, "-");
            if (rawSlug !== normalizedSlug) {
              parts[2] = normalizedSlug;
              const newUrl = req.nextUrl.clone();
              newUrl.pathname = parts.join("/");
              return NextResponse.redirect(newUrl);
            }
          }
        }
        // Allow unauthenticated guest exploration of the Northwind Pay live sandbox and proxied API routes
        if (path.startsWith("/w/northwind-pay") || path.startsWith("/api/")) {
          return;
        }
        if (isProtected(req)) await auth.protect();
      },
      { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
    )
  : (req: NextRequest) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/w/")) {
        const parts = path.split("/");
        if (parts[2]) {
          const rawSlug = parts[2];
          const normalizedSlug = decodeURIComponent(rawSlug).trim().toLowerCase().replace(/\s+/g, "-");
          if (rawSlug !== normalizedSlug) {
            const newUrl = req.nextUrl.clone();
            parts[2] = normalizedSlug;
            newUrl.pathname = parts.join("/");
            return NextResponse.redirect(newUrl);
          }
        }
      }
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
