"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FOOTER_NAV, MOBILE_NAV_KEYS, PRIMARY_NAV, REGISTRY_NAV, formatBadge, isActive } from "@/components/shell/nav";
import { useNavCounts } from "@/components/shell/use-shell-data";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

/** Mobile bottom bar (05 §9): Home, Alerts, Reviews, Steward, More. */
export function MobileBottomBar() {
  const { slug } = useWorkspace();
  const segment = useSelectedLayoutSegment() ?? undefined;
  const counts = useNavCounts();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = MOBILE_NAV_KEYS.map((k) => PRIMARY_NAV.find((i) => i.key === k)!);
  const moreItems = [
    ...PRIMARY_NAV.filter((i) => !(MOBILE_NAV_KEYS as readonly string[]).includes(i.key) && i.key !== "registry"),
    ...REGISTRY_NAV,
    ...FOOTER_NAV,
  ];
  const moreActive = moreItems.some((i) => isActive(i, segment));

  const slot = "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium";
  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-(--z-rail) flex h-[calc(var(--bottombar-h)+env(safe-area-inset-bottom))] border-t border-border-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {items.map((item) => {
          const active = isActive(item, segment);
          const Icon = item.icon;
          const badge = formatBadge(item.badge ? counts[item.badge] : undefined);
          return (
            <Link
              key={item.key}
              href={`/w/${slug}/${item.href}`}
              aria-current={active ? "page" : undefined}
              className={cn(slot, active ? "text-brand" : "text-text-secondary")}
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.5} />
              {item.label}
              {badge && (
                <span className="tabular absolute top-1.5 left-[calc(50%+4px)] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-solid px-1 text-[10px] text-text-on-brand">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn(slot, moreActive ? "text-brand" : "text-text-secondary")}
        >
          <Menu aria-hidden className="size-5" strokeWidth={1.5} />
          More
        </button>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(16px+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item, segment);
              return (
                <li key={item.key}>
                  <Link
                    href={`/w/${slug}/${item.href}`}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-border-subtle text-body-sm",
                      active ? "bg-brand-soft text-text-primary" : "text-text-secondary",
                    )}
                  >
                    <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
