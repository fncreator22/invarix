import type { Metadata } from "next";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { SignIn } from "@clerk/nextjs";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Sign in · INVARIX" };

export default function SignInPage() {
  if (CLERK_ENABLED) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/workspaces"
        />
        <div className="text-center">
          <p className="text-caption text-text-muted">
            Prefer local zero-trust auth?{" "}
            <a href="/w/northwind-pay/home" className="text-brand hover:underline font-medium">
              Launch Live Sandbox (0 Login)
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Standalone Custom Auth Mode (No third-party dependency required)
  return <AuthCard initialMode="sign-in" redirectUrl="/workspaces" />;
}
