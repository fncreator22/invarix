"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Check, ExternalLink, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerErrorView } from "@/components/system/status-views";
import { errorMessage, requestIdOf } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { lastWorkspace, rememberWorkspace, useMe } from "@/lib/workspace";

export function WorkspaceSelector() {
  const router = useRouter();
  const me = useMe();
  const [, startTransition] = useTransition();

  const memberships = me.data?.memberships ?? [];
  const lastSlug = lastWorkspace();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const forceSelect = searchParams?.get("select") === "1";

  // Only auto-redirect on clean initial login if there is only 1 workspace or last visited exists AND not explicitly asking to choose
  useEffect(() => {
    if (!me.data) return;
    if (memberships.length === 0) {
      router.replace("/onboarding");
      return;
    }
    // If the user deliberately came to /workspaces or has multiple workspaces, let them choose unless it's an initial single-workspace login
    if (forceSelect) return;

    if (memberships.length === 1 && memberships[0].status === "ready") {
      router.replace(`/w/${memberships[0].slug}/home`);
    }
  }, [me.data, memberships, forceSelect, router]);

  if (me.isPending) {
    return (
      <div className="card-e1 w-full space-y-4 p-8" aria-busy="true" aria-label="Loading workspaces">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <ServerErrorView
        requestId={requestIdOf(me.error)}
        message={errorMessage(me.error)}
        onRetry={() => void me.refetch()}
      />
    );
  }

  return (
    <section aria-labelledby="ws-picker-title" className="card-e1 w-full overflow-hidden shadow-e2">
      <div className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-center justify-between">
          <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
            Your Account
          </p>
          <Badge variant="neutral" className="capitalize">
            {memberships.length} {memberships.length === 1 ? "workspace" : "workspaces"}
          </Badge>
        </div>
        <h1 id="ws-picker-title" className="mt-2 text-h2 font-semibold">
          Select a Workspace
        </h1>
        <p className="mt-1 text-body text-text-secondary">
          Pick a workspace to open, or create a new one for a separate environment or team.
        </p>
      </div>

      <div className="space-y-3 px-6 py-6 sm:px-8">
        {memberships.map((m) => {
          const isLastVisited = m.slug === lastSlug;
          return (
            <button
              type="button"
              key={m.workspace_id}
              onClick={() => {
                rememberWorkspace(m.slug);
                startTransition(() => {
                  router.push(`/w/${m.slug}/home`);
                });
              }}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all",
                isLastVisited
                  ? "border-brand bg-brand-soft/40 shadow-sm"
                  : "border-border-subtle bg-surface hover:border-border hover:bg-raised",
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-body font-bold text-brand">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-text-primary group-hover:text-brand">
                      {m.name}
                    </span>
                    {isLastVisited && (
                      <Badge variant="default" className="text-[10px]">
                        Last visited
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-caption text-text-muted">
                    <span className="font-mono">/w/{m.slug}</span>
                    <span>&bull;</span>
                    <span className="capitalize">{m.role}</span>
                    {m.status !== "ready" && (
                      <>
                        <span>&bull;</span>
                        <span className="capitalize text-warning">{m.status}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-3">
                <span className="inline-flex size-8 items-center justify-center rounded-md text-text-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t border-border-subtle bg-surface px-6 py-4 sm:px-8">
        <span className="text-caption text-text-muted">
          Need a fresh environment?
        </span>
        <Button asChild variant="secondary" size="sm">
          <Link href="/onboarding?new=1">
            <Plus aria-hidden className="size-4" />
            Create new workspace
          </Link>
        </Button>
      </div>
    </section>
  );
}
