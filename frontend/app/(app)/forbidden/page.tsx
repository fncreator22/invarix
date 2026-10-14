import type { Metadata } from "next";
import { ForbiddenView } from "@/components/system/status-views";

export const metadata: Metadata = { title: "No access" };

/** SCR-X-02 as a standalone route; in-app pages render <ForbiddenView /> inline on FORBIDDEN. */
export default function ForbiddenPage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center">
      <ForbiddenView homeHref="/onboarding" />
    </main>
  );
}
