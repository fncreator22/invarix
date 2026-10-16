import type { Metadata } from "next";
import { AuthPage } from "@/components/ui/auth-page";

export const metadata: Metadata = { title: "Create your account & workspace · INVARIX" };

export default function SignUpPage() {
  return <AuthPage initialMode="sign-up" />;
}
