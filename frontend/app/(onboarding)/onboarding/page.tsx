import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingFlow, OnboardingShell } from "@/components/onboarding/onboarding-flow";
import { SessionExpiredModal } from "@/components/system/overlays";

export const metadata: Metadata = { title: "Get started" };

export default function OnboardingPage() {
  return (
    <OnboardingShell>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <OnboardingFlow />
        <SessionExpiredModal />
      </Suspense>
    </OnboardingShell>
  );
}
