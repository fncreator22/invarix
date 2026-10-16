import type { Metadata } from "next";
import { AuthPage } from "@/components/ui/auth-page";

export const metadata: Metadata = {
  title: "Authentication · INVARIX",
  description: "Sign in or register for INVARIX architecture safety engine.",
};

export default function Page() {
  return <AuthPage />;
}
