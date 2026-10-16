"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import {
  Building,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Key,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo, LogoMark } from "@/components/logo";
import { FOOTER_NAV, PRIMARY_NAV, formatBadge, isActive, type NavItem } from "@/components/shell/nav";
import { useShell } from "@/components/shell/shell-context";
import { useNavCounts } from "@/components/shell/use-shell-data";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { usePathname } from "next/navigation";

const SETTINGS_SUB_ITEMS = [
  { key: "profile", label: "Profile & General", href: "settings/profile", icon: User },
  { key: "workspace", label: "Workspace & Clocks", href: "settings/workspace", icon: Building },
  { key: "api-keys", label: "API Keys", href: "settings/api-keys", icon: Key },
  { key: "integrations", label: "Integrations & Webhooks", href: "settings/integrations", icon: Zap },
  { key: "ai-governance", label: "AI Governance", href: "settings/ai-governance", icon: Sparkles },
  { key: "data-privacy", label: "Data Privacy & GDPR", href: "settings/data-privacy", icon: ShieldCheck },
  { key: "billing", label: "Plans & Pricing", href: "settings/billing", icon: CreditCard },
];

function RailLink({ item, collapsed, count }: { item: NavItem; collapsed: boolean; count?: number }) {
  const { slug } = useWorkspace();
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const active = isActive(item, segment ?? undefined);
  const Icon = item.icon;
  const badge = formatBadge(count);
  const isSettings = item.key === "settings";
  const isSettingsExpanded = isSettings && (active || pathname.includes("/settings"));

  const link = (
    <div className="flex flex-col">
      <Link
        href={`/w/${slug}/${item.href}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-md px-3 text-body font-medium transition-colors duration-(--dur-fast)",
          active ? "bg-brand-soft text-text-primary font-semibold" : "text-text-secondary hover:bg-brand-soft/60 hover:text-text-primary",
          collapsed && "justify-center px-0",
        )}
      >
        {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
        <Icon aria-hidden className={cn("size-5 shrink-0", active ? "text-brand" : "text-text-secondary")} strokeWidth={1.5} />
        <span className={cn("truncate flex-1 text-left", collapsed && "sr-only")}>{item.label}</span>
        {isSettings && !collapsed && (
          <ChevronDown
            className={cn(
              "size-3.5 text-text-muted transition-transform duration-200",
              !isSettingsExpanded && "-rotate-90"
            )}
          />
        )}
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

      {/* Sub-navigation tree for Settings when expanded */}
      {isSettings && !collapsed && isSettingsExpanded && (
        <div className="ml-3 pl-3.5 border-l-2 border-border-subtle/80 flex flex-col gap-1 py-1.5 my-1 animate-in fade-in-50 duration-150">
          {SETTINGS_SUB_ITEMS.map((sub) => {
            const isSubActive =
              pathname.includes(`/settings/${sub.key}`) ||
              (sub.key === "profile" && pathname.endsWith("/settings"));
            const SubIcon = sub.icon;
            return (
              <Link
                key={sub.key}
                href={`/w/${slug}/${sub.href}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all",
                  isSubActive
                    ? "bg-brand text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
                )}
              >
                <SubIcon className={cn("size-3.5 shrink-0", isSubActive ? "text-white" : "text-text-muted")} />
                <span className="truncate">{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
  if (!collapsed) return link;

  if (isSettings) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Settings navigation menu"
                className={cn(
                  "group relative flex h-10 w-10 mx-auto items-center justify-center rounded-md text-body font-medium transition-colors duration-(--dur-fast)",
                  active || pathname.includes("/settings")
                    ? "bg-brand-soft text-text-primary font-semibold ring-1 ring-brand/30"
                    : "text-text-secondary hover:bg-brand-soft/60 hover:text-text-primary",
                )}
              >
                {(active || pathname.includes("/settings")) && (
                  <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />
                )}
                <Icon aria-hidden className={cn("size-5 shrink-0", active || pathname.includes("/settings") ? "text-brand" : "text-text-secondary")} strokeWidth={1.5} />
                <span className="sr-only">Settings</span>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            Settings (Click to view all 7 sections)
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-60 p-1.5 shadow-xl border border-border-subtle bg-surface">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center justify-between">
            <span>Settings</span>
            <span className="text-[10px] font-mono font-normal lowercase bg-surface-sunken px-1.5 py-0.5 rounded border border-border-subtle">
              7 sections
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 border-border-subtle" />
          {SETTINGS_SUB_ITEMS.map((sub) => {
            const isSubActive =
              pathname.includes(`/settings/${sub.key}`) ||
              (sub.key === "profile" && pathname.endsWith("/settings"));
            const SubIcon = sub.icon;
            return (
              <DropdownMenuItem key={sub.key} asChild className="p-0 focus:bg-transparent">
                <Link
                  href={`/w/${slug}/${sub.href}`}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer",
                    isSubActive
                      ? "bg-brand text-white font-semibold shadow-xs"
                      : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus:bg-surface-sunken focus:text-text-primary"
                  )}
                >
                  <SubIcon className={cn("size-4 shrink-0", isSubActive ? "text-white" : "text-text-muted")} />
                  <span className="truncate flex-1">{sub.label}</span>
                  {isSubActive && <span className="size-1.5 rounded-full bg-white" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
      </TooltipContent>
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
        <Link href={`/w/${slug}/home`} aria-label="INVARIX home" className="rounded-md">
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
