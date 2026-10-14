"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoMark } from "@/components/logo";
import { CommandPalette } from "@/components/shell/command-palette";
import { EntityDrawer } from "@/components/shell/entity-drawer";
import { LeftRail } from "@/components/shell/left-rail";
import { MobileBottomBar } from "@/components/shell/mobile-bottom-bar";
import { SampleBanner } from "@/components/shell/sample-banner";
import { ShellProvider } from "@/components/shell/shell-context";
import { StewardPanel } from "@/components/shell/steward-panel";
import { TopBar } from "@/components/shell/top-bar";
import { useWorkspaceEvents } from "@/components/shell/use-workspace-events";
import { ColdStartCard, HydrationSplash, OfflineBanner, SessionExpiredModal } from "@/components/system/overlays";
import { ProvisioningView } from "@/components/system/provisioning-view";
import { DataMissingView, NotFoundView, ServerErrorView } from "@/components/system/status-views";
import { isApiError, useApi, wsPath } from "@/lib/api";
import { errorBehavior, errorMessage, requestIdOf } from "@/lib/errors";
import { hasRole, type WorkspaceOut } from "@/lib/types";
import { meQueryKey, useResolveWorkspace, WorkspaceProvider, type WorkspaceContextValue } from "@/lib/workspace";

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-(--z-splash) rounded-md bg-brand-solid px-4 py-2 text-text-on-brand focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading workspace">
      <div className="hidden w-(--rail-w-collapsed) shrink-0 flex-col gap-2 border-r border-border-subtle bg-surface p-3 sm:flex md:w-(--rail-w)">
        <LogoMark className="mb-4 size-7" />
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
      <div className="flex-1">
        <div className="flex h-(--topbar-h) items-center gap-3 border-b border-border-subtle px-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="ml-auto h-8 w-56" />
        </div>
        <div className="mx-auto max-w-[1200px] space-y-4 p-4 sm:p-5 md:p-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

/** Polls a provisioning workspace and refreshes memberships once it is ready (SCR-X-05). */
function ProvisioningGate({ wsId, name }: { wsId: string; name: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const ws = useQuery({
    queryKey: ["workspace-provisioning", wsId],
    queryFn: ({ signal }) => api<WorkspaceOut>(wsPath(wsId), { signal }),
    refetchInterval: (q) => (q.state.data?.status === "provisioning" || !q.state.data ? 1500 : false),
  });
  useEffect(() => {
    if (ws.data && ws.data.status !== "provisioning") void qc.invalidateQueries({ queryKey: meQueryKey });
  }, [qc, ws.data]);
  return <ProvisioningView name={name} />;
}

function ReadyShell({
  value,
  workspaceError,
  children,
}: {
  value: WorkspaceContextValue;
  workspaceError: unknown;
  children: ReactNode;
}) {
  const sentinel = useWorkspaceEvents(value.wsId, true);
  return (
    <WorkspaceProvider value={value}>
      <ShellProvider>
        <div className="flex min-h-dvh">
          <LeftRail />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar sentinel={sentinel} />
            <OfflineBanner />
            <SampleBanner />
            <main
              id="main"
              tabIndex={-1}
              className="flex-1 pb-[calc(var(--bottombar-h)+env(safe-area-inset-bottom))] outline-none sm:pb-0"
            >
              {workspaceError ? <WorkspaceErrorGate value={value} error={workspaceError} /> : children}
            </main>
          </div>
          <StewardPanel />
        </div>
        <MobileBottomBar />
        <EntityDrawer />
        <CommandPalette />
      </ShellProvider>
    </WorkspaceProvider>
  );
}

/** Data missing (SCR-X-04) is detected from the workspace record request. */
function WorkspaceErrorGate({ value, error }: { value: WorkspaceContextValue; error: unknown }) {
  const api = useApi();
  const qc = useQueryClient();
  const rehydrate = useMutation({
    mutationFn: () => api<unknown>(wsPath(value.wsId, "/sample-data"), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries(),
  });
  if (errorBehavior(error) === "data-missing")
    return (
      <DataMissingView isAdmin={hasRole(value.role, "admin")} onRehydrate={() => rehydrate.mutate()} busy={rehydrate.isPending} />
    );
  return <ServerErrorView requestId={requestIdOf(error)} message={errorMessage(error)} onRetry={() => qc.invalidateQueries()} />;
}

export function AppShell({ slug, children }: { slug: string; children: ReactNode }) {
  const router = useRouter();
  const res = useResolveWorkspace(slug);
  return (
    <>
      <SkipLink />
      <HydrationSplash />
      <ColdStartCard />
      <SessionExpiredModal />
      {res.state === "loading" ? (
        <ShellSkeleton />
      ) : res.state === "error" ? (
        isApiError(res.error) && res.error.code === "UNAUTHENTICATED" ? (
          <ShellSkeleton />
        ) : (
          <main id="main">
            <ServerErrorView requestId={requestIdOf(res.error)} message={errorMessage(res.error)} onRetry={res.retry} />
          </main>
        )
      ) : res.state === "not-found" ? (
        <main id="main">
          <NotFoundView homeHref="/onboarding" />
        </main>
      ) : res.state === "provisioning" ? (
        <main id="main">
          <ProvisioningGate wsId={res.membership.workspace_id} name={res.membership.name} />
        </main>
      ) : res.state === "failed" ? (
        <main id="main">
          <ServerErrorView
            message="Setting up this workspace didn't finish. You can retry from onboarding or start a blank workspace."
            onRetry={() => router.push("/onboarding")}
          />
        </main>
      ) : (
        <ReadyShell value={res.value} workspaceError={res.workspaceError}>{children}</ReadyShell>
      )}
    </>
  );
}
