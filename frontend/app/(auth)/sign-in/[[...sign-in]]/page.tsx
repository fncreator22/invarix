import type { Metadata } from "next";
import { AuthPage } from "@/components/ui/auth-page";

export const metadata: Metadata = { title: "Sign in · INVARIX" };

export default function SignInPage() {
  return <AuthPage initialMode="sign-in" />;
}
