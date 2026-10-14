import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingShell } from "@/components/onboarding/onboarding-flow";
import { SessionExpiredModal } from "@/components/system/overlays";
import { WorkspaceSelector } from "@/components/workspaces/workspace-selector";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  return (
    <OnboardingShell>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <WorkspaceSelector />
        <SessionExpiredModal />
      </Suspense>
    </OnboardingShell>
  );
}
