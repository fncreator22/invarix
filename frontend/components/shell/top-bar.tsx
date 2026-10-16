"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, HelpCircle, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickGuideModal } from "@/components/guide/quick-guide-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClockChip } from "@/components/clock-chip";
import { LogoMark } from "@/components/logo";
import { SentinelPill, type SentinelState } from "@/components/sentinel-pill";
import { AccountMenu } from "@/components/shell/account-menu";
import { SEGMENT_LABELS } from "@/components/shell/nav";
import { NotificationsBell } from "@/components/shell/notifications-bell";
import { useShell } from "@/components/shell/shell-context";
import { middleTruncate } from "@/lib/format";
import { useApi, wsPath } from "@/lib/api";
import { hasRole, type ClockOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMe, useWorkspace } from "@/lib/workspace";

// Sample workspace presets (07 seed spec: as-of 17 Oct 2026; FLOW-08 "Quiet Expiry Week").
const SAMPLE_PRESETS = [
  { label: "Sample start · 17 Oct", asOf: 1792195200 },
  { label: "Quiet Expiry Week", asOf: 1792627200 },
];

function WorkspaceSwitcher() {
  const { slug, name } = useWorkspace();
  const { data } = useMe();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-body font-semibold text-text-primary hover:bg-brand-soft">
        <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-caption font-bold text-brand">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[6.5rem] truncate sm:max-w-[10rem]">{name}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-text-muted" />
        <span className="sr-only">Switch workspace</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="eyebrow text-text-muted">Workspaces</DropdownMenuLabel>
        {data?.memberships.map((m) => (
          <DropdownMenuItem key={m.workspace_id} asChild>
            <Link href={`/w/${m.slug}/home`}>
              <span className="truncate">{m.name}</span>
              {m.slug === slug && <Check aria-hidden className="ml-auto text-brand" />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/workspaces?select=1">
            All workspaces
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding?new=1">
            <Plus aria-hidden />
            New workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  const { slug } = useWorkspace();
  const parts = pathname.split("/").slice(3).filter(Boolean); // after /w/[ws]
  if (parts.length < 2) return null; // detail pages only (05 §7.4)
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 @5xl:block">
      <ol className="flex items-center gap-1.5 text-body-sm text-text-muted">
        {parts.map((p, i) => {
          const label = SEGMENT_LABELS[p] ?? middleTruncate(decodeURIComponent(p));
          const last = i === parts.length - 1;
          return (
            <li key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {last ? (
                <span aria-current="page" className={cn("truncate text-text-primary", !SEGMENT_LABELS[p] && "font-mono")}>
                  {label}
                </span>
              ) : (
                <Link href={`/w/${slug}/${parts.slice(0, i + 1).join("/")}`} className="truncate hover:text-text-primary">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TopBar({ sentinel }: { sentinel: SentinelState }) {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, workspace, role, slug } = useWorkspace();
  const { setCommandOpen, stewardOpen, setStewardOpen } = useShell();
  const isAdmin = hasRole(role, "admin");

  const clock = useMutation({
    mutationFn: (asOf: number) => api<ClockOut>(wsPath(wsId, "/clock"), { method: "PUT", body: { as_of: asOf } }),
    meta: { success: "Clock updated. Sentinel is rerunning detection." },
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey.includes(wsId) }),
  });
  const rerun = useMutation({
    mutationFn: () => api<unknown>(wsPath(wsId, "/sentinel/run"), { method: "POST" }),
    meta: { success: "Sentinel run started." },
  });

  const [guideOpen, setGuideOpen] = useState(false);
  const [topBarPrefs, setTopBarPrefs] = useState({
    showClock: true,
    showSentinel: true,
    showGuide: false,
    showSteward: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("invarix_topbar_prefs");
      if (stored) {
        setTopBarPrefs((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {}

    const handlePrefsChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setTopBarPrefs((prev) => ({ ...prev, ...customEvent.detail }));
      }
    };
    window.addEventListener("topbar-prefs-changed", handlePrefsChange);
    return () => window.removeEventListener("topbar-prefs-changed", handlePrefsChange);
  }, []);

  return (
    <>
      <header className="@container sticky top-0 z-(--z-topbar) flex h-(--topbar-h) items-center gap-2 border-b border-border-subtle bg-canvas/85 px-3 backdrop-blur sm:px-4">
        <Link href={`/w/${slug}/home`} aria-label="INVARIX home" className="sm:hidden">
          <LogoMark className="size-6" />
        </Link>
        <WorkspaceSwitcher />
        <Breadcrumbs />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Search and commands"
            aria-keyshortcuts="Meta+K Control+K"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-surface px-2.5 text-body-sm text-text-muted hover:border-border-strong hover:text-text-primary @3xl:w-56"
          >
            <Search aria-hidden className="size-4" />
            <span className="hidden @3xl:inline">Search</span>
            <kbd className="ml-auto hidden rounded border border-border-subtle bg-sunken px-1.5 font-mono text-[11px] @3xl:inline">⌘K</kbd>
          </button>
          {workspace && (topBarPrefs.showClock || topBarPrefs.showSentinel) && (
            <div className="hidden items-center gap-2 @4xl:flex">
              {topBarPrefs.showClock && (
                <ClockChip
                  mode={workspace.clock_mode}
                  asOf={workspace.as_of}
                  canEdit={isAdmin}
                  presets={workspace.data_mode === "sample" ? SAMPLE_PRESETS : []}
                  onApply={(asOf) => clock.mutateAsync(asOf)}
                />
              )}
              {topBarPrefs.showSentinel && (
                <SentinelPill
                  state={sentinel === "idle" && rerun.isPending ? "running" : sentinel}
                  lastRunAt={workspace.last_sentinel_at}
                  onRetry={isAdmin ? () => rerun.mutate() : undefined}
                />
              )}
            </div>
          )}
          {topBarPrefs.showGuide && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGuideOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated h-8 px-2"
            >
              <HelpCircle className="size-4 text-brand" />
              <span>Quick Guide</span>
            </Button>
          )}
          {topBarPrefs.showSteward && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={stewardOpen ? "Close Steward" : "Ask Steward"}
                  aria-pressed={stewardOpen}
                  onClick={() => setStewardOpen(!stewardOpen)}
                  className={cn(
                    "hidden sm:inline-flex items-center gap-1.5 h-8 px-2 text-caption font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
                    stewardOpen && "bg-brand-soft text-brand font-semibold",
                  )}
                >
                  <Sparkles aria-hidden className="size-4 text-brand" strokeWidth={1.5} />
                  <span className="hidden xl:inline">Ask Steward</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ask Steward (AI Agent)</TooltipContent>
            </Tooltip>
          )}
          <NotificationsBell />
          <AccountMenu />
        </div>
      </header>
      <QuickGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
