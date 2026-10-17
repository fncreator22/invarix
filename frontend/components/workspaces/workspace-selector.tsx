"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Check,
  ExternalLink,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Database,
  Layers,
  Terminal,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { lastWorkspace, rememberWorkspace, useMe } from "@/lib/workspace";
import { useAuthBridge } from "@/lib/auth";
import type { Membership } from "@/lib/types";

export function WorkspaceSelector() {
  const router = useRouter();
  const me = useMe();
  const { user } = useAuthBridge();
  const [, startTransition] = useTransition();

  const [localWorkspaces, setLocalWorkspaces] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("invarix_custom_workspaces");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const apiMemberships = me.data?.memberships ?? [];
  const defaultNorthwind: Membership = {
    workspace_id: "ws_01m51y6cjj8fpjqktrppcq05n8",
    slug: "northwind-pay",
    name: "Northwind Pay",
    role: "owner" as any,
    person_id: null,
    status: "ready" as any,
    description: "Production payments mesh with live topology & 4 active waivers",
  };

  // Combine API memberships, custom local workspaces, and default Northwind
  const allMemberships = [...apiMemberships];
  if (!allMemberships.some((m) => m.slug === "northwind-pay")) {
    allMemberships.unshift(defaultNorthwind);
  }
  for (const lw of localWorkspaces) {
    if (!allMemberships.some((m) => m.slug === lw.slug)) {
      allMemberships.push(lw);
    }
  }

  const lastSlug = lastWorkspace() || "northwind-pay";
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const forceSelect = searchParams?.get("select") === "1";

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Main Workspace Card Container */}
      <section aria-labelledby="ws-picker-title" className="card-e1 w-full overflow-hidden shadow-e2 border border-border-default">
        <div className="px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
                {user ? `${user.email} · Organizations` : "Active Organizations & Workspaces"}
              </p>
            </div>
            <Badge variant="neutral" className="capitalize">
              {allMemberships.length} {allMemberships.length === 1 ? "workspace" : "workspaces"}
            </Badge>
          </div>
          <h1 id="ws-picker-title" className="mt-2 text-h2 font-semibold text-text-primary">
            Select an Organization Workspace
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Each workspace runs in an isolated FalkorDB tri-planar graph with its own microservice topology, risk score limits, and pre-merge CI gates.
          </p>
        </div>

        {/* Workspace Cards */}
        <div className="space-y-3 px-6 py-6 sm:px-8">
          {allMemberships.map((m) => {
            const isLastVisited = m.slug === lastSlug;
            return (
              <button
                type="button"
                key={m.workspace_id || m.slug}
                onClick={() => {
                  rememberWorkspace(m.slug);
                  startTransition(() => {
                    router.push(`/w/${m.slug}/home`);
                  });
                }}
                className={cn(
                  "group flex w-full items-center justify-between rounded-xl border p-4 sm:p-5 text-left transition-all",
                  isLastVisited
                    ? "border-brand bg-brand-soft/50 shadow-sm"
                    : "border-border-subtle bg-surface hover:border-brand/40 hover:bg-raised",
                )}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft border border-brand/20 text-body font-bold text-brand shadow-xs">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-text-primary group-hover:text-brand text-base">
                        {m.name}
                      </span>
                      {isLastVisited && (
                        <Badge variant="default" className="text-[10px] bg-brand text-white">
                          Active / Recent
                        </Badge>
                      )}
                      <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-mono text-text-muted capitalize">
                        {m.role || "Owner"}
                      </span>
                    </div>

                    <p className="text-body-sm text-text-secondary truncate">
                      {m.description || `Isolated tenant container: org_${m.slug} & mem_${m.slug}`}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-caption text-text-muted font-mono text-[11px] pt-0.5">
                      <span className="text-brand">/w/{m.slug}</span>
                      <span>•</span>
                      <span>Graph: org_{m.workspace_id?.slice(0, 10) || m.slug}</span>
                      <span>•</span>
                      <span className="text-emerald-500 font-sans font-medium">● 0-Leak Isolation</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-muted group-hover:border-brand group-hover:bg-brand group-hover:text-white transition-all shadow-xs">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer: Create Workspace CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle bg-sunken/40 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2 text-caption text-text-muted">
            <Building2 className="size-4 text-brand" />
            <span>Need an isolated environment for your engineering team?</span>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto font-medium shadow-sm">
            <Link href="/onboarding?new=1">
              <Plus aria-hidden className="mr-1.5 size-4" />
              Create New Workspace
            </Link>
          </Button>
        </div>
      </section>

      {/* Tenant Architecture & Security Card */}
      <section className="card-e1 p-6 border border-border-subtle bg-surface/60 rounded-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <Database className="size-4 text-proof" />
          <h2 className="text-body font-semibold text-text-primary">
            INVARIX Tri-Planar Graph Isolation Architecture
          </h2>
        </div>
        <p className="text-body-sm text-text-secondary">
          Unlike monolithic SQL databases where foreign keys risk cross-tenant bleed, INVARIX enforces mathematical separation across three distinct FalkorDB Redis-protocol graph spaces per workspace:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-sunken border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-brand">
              <Layers className="size-3.5" />
              <span>platform_dev</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">
              Global identities, organization memberships, API keys, and notification routing.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-sunken border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-proof">
              <Cpu className="size-3.5" />
              <span>org_&lt;ws_id&gt;</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">
              Microservices, AST code waivers, shortest proof paths, and CI/CD circuit breakers.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-sunken border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-500">
              <Terminal className="size-3.5" />
              <span>mem_&lt;ws_id&gt;</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">
              Steward conversational memory, episodic turns, learned facts, and on-call handoffs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
