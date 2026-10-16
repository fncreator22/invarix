import type { Metadata } from "next";
import Link from "next/link";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { SignUp } from "@clerk/nextjs";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Create your account & workspace · INVARIX" };

export default function SignUpPage() {
  if (CLERK_ENABLED) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/onboarding"
        />
        <p className="max-w-sm text-center text-body-sm text-text-muted">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="text-brand hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand hover:underline">
            Privacy
          </Link>{" "}
          notes.
        </p>
      </div>
    );
  }

  // Standalone Custom Auth Mode
  return <AuthCard initialMode="sign-up" redirectUrl="/onboarding" />;
}
