"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo, LogoMark } from "@/components/logo";
import { FOOTER_NAV, PRIMARY_NAV, formatBadge, isActive, type NavItem } from "@/components/shell/nav";
import { useShell } from "@/components/shell/shell-context";
import { useNavCounts } from "@/components/shell/use-shell-data";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

function RailLink({ item, collapsed, count }: { item: NavItem; collapsed: boolean; count?: number }) {
  const { slug } = useWorkspace();
  const segment = useSelectedLayoutSegment();
  const active = isActive(item, segment ?? undefined);
  const Icon = item.icon;
  const badge = formatBadge(count);
  const link = (
    <Link
      href={`/w/${slug}/${item.href}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-md px-3 text-body font-medium transition-colors duration-(--dur-fast)",
        active ? "bg-brand-soft text-text-primary" : "text-text-secondary hover:bg-brand-soft/60 hover:text-text-primary",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
      <Icon aria-hidden className={cn("size-5 shrink-0", active ? "text-brand" : "text-text-secondary")} strokeWidth={1.5} />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
      {badge && (
        <span
          className={cn(
            "tabular ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-solid px-1.5 text-[11px] font-semibold text-text-on-brand",
            collapsed && "absolute top-1 right-1 ml-0 h-4 min-w-4 px-1 text-[10px]",
          )}
        >
          {badge}
          <span className="sr-only"> {item.badge === "alerts" ? "open alerts" : "reviews assigned to you"}</span>
        </span>
      )}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/** Left rail: 248 px expanded / 64 px collapsed on desktop, icons only on tablet, hidden on mobile. */
export function LeftRail() {
  const { railCollapsed, toggleRail } = useShell();
  const counts = useNavCounts();
  const { slug } = useWorkspace();
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "sticky top-0 z-(--z-rail) hidden h-dvh shrink-0 flex-col border-r border-border-subtle bg-surface sm:flex",
        "w-(--rail-w-collapsed)",
        !railCollapsed && "md:w-(--rail-w)",
      )}
    >
      <div className={cn("flex h-(--topbar-h) items-center border-b border-border-subtle px-4", railCollapsed && "md:justify-center md:px-0")}>
        <Link href={`/w/${slug}/home`} aria-label="Reprieve home" className="rounded-md">
          <LogoMark className={cn("md:hidden", railCollapsed && "md:block")} />
          <Logo className={cn("hidden", !railCollapsed && "md:inline-flex")} />
        </Link>
      </div>
      {/* Tablet always collapsed; desktop follows the user's preference. */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {PRIMARY_NAV.map((item) => (
          <ResponsiveRailLink key={item.key} item={item} count={item.badge ? counts[item.badge] : undefined} />
        ))}
        <div role="separator" className="my-2 border-t border-border-subtle" />
        {FOOTER_NAV.map((item) => (
          <ResponsiveRailLink key={item.key} item={item} />
        ))}
      </div>
      <div className="hidden border-t border-border-subtle p-2 md:block">
        <button
          type="button"
          onClick={toggleRail}
          aria-label={railCollapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!railCollapsed}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-md px-3 text-body-sm text-text-secondary hover:bg-brand-soft hover:text-text-primary",
            railCollapsed && "justify-center px-0",
          )}
        >
          {railCollapsed ? <PanelLeftOpen aria-hidden className="size-4" /> : <PanelLeftClose aria-hidden className="size-4" />}
          {!railCollapsed && "Collapse"}
        </button>
      </div>
    </nav>
  );
}

function ResponsiveRailLink({ item, count }: { item: NavItem; count?: number }) {
  const { railCollapsed } = useShell();
  return (
    <>
      <div className="md:hidden">
        <RailLink item={item} collapsed count={count} />
      </div>
      <div className="hidden md:block">
        <RailLink item={item} collapsed={railCollapsed} count={count} />
      </div>
    </>
  );
}
