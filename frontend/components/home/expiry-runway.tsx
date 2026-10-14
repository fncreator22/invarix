"use client";

import { useMemo } from "react";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { RelativeDate } from "@/components/relative-date";
import type { RunwayItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY = 86400;
const SPAN = 30;
const COLLISION = { count: 3, days: 7 };

/** Largest set of expiries inside any 7-day window, if it reaches the collision threshold (R6 rule shape). */
function collision(items: RunwayItem[]) {
  const t = items.map((i) => i.expires_at).sort((a, b) => a - b);
  let best: [number, number] | null = null;
  for (let i = 0, j = 0; j < t.length; j++) {
    while (t[j] - t[i] > COLLISION.days * DAY) i++;
    if (j - i + 1 >= COLLISION.count && (!best || j - i > best[1] - best[0])) best = [i, j];
  }
  return best && { from: t[best[0]], to: t[best[1]], n: best[1] - best[0] + 1 };
}

/** 30-day expiry track grouped by team; collisions bracketed (05 §8 ExpiryRunway). Agenda list on mobile. */
export function ExpiryRunway({ items, asOf }: { items: RunwayItem[]; asOf: number }) {
  const { open } = useEntityDrawer();
  const teams = Object.values(
    items.reduce<Record<string, { name: string; items: RunwayItem[] }>>((acc, it) => {
      (acc[it.team.id] ??= { name: it.team.label ?? it.team.id, items: [] }).items.push(it);
      return acc;
    }, {}),
  );
  const x = (t: number) => `${Math.min(Math.max((t - asOf) / (SPAN * DAY), 0), 1) * 100}%`;

  // Deduplicate items on mobile agenda list where an exception may span multiple teams
  const mobileItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((it) => {
      if (seen.has(it.exception.id)) return false;
      seen.add(it.exception.id);
      return true;
    });
  }, [items]);

  return (
    <>
      <div className="hidden md:block">
        <div className="relative ml-35 mb-2 h-4 text-caption text-text-muted">
          {[0, 7, 14, 21, 30].map((d) => (
            <span key={d} className="absolute -translate-x-1/2" style={{ left: `${(d / SPAN) * 100}%` }}>
              {d === 0 ? "Today" : `+${d}d`}
            </span>
          ))}
        </div>
        <ul className="space-y-2">
          {teams.map((team) => {
            const c = collision(team.items);
            return (
              <li key={team.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-body-sm text-text-secondary">{team.name}</span>
                <div className="relative h-8 flex-1 rounded-md bg-sunken">
                  {c && (
                    <div
                      className="absolute inset-y-0 rounded-md border border-sev-high bg-sev-high-soft"
                      style={{ left: x(c.from), width: `calc(${x(c.to)} - ${x(c.from)} + 12px)` }}
                      title={`${c.n} expiries within ${COLLISION.days} days`}
                    >
                      <span className="absolute -top-2 right-1 rounded bg-sev-high px-1 text-[10px] font-semibold text-canvas">
                        {c.n} in {COLLISION.days}d
                      </span>
                    </div>
                  )}
                  {team.items.map((it, idx) => (
                    <button
                      key={`${team.name}-${it.exception.id}-${idx}`}
                      type="button"
                      onClick={() => open(it.exception.id)}
                      className={cn(
                        "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-transform hover:scale-150 focus-visible:scale-150",
                        it.expires_at < asOf ? "bg-sev-critical" : it.severity >= 4 ? "bg-sev-high" : "bg-brand",
                      )}
                      style={{ left: x(it.expires_at) }}
                      aria-label={`${it.exception.label}, expires ${new Date(it.expires_at * 1000).toDateString()}`}
                      title={it.exception.label ?? it.exception.id}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="space-y-2 md:hidden">
        {mobileItems.map((it) => (
          <li key={it.exception.id}>
            <button type="button" onClick={() => open(it.exception.id)} className="flex w-full justify-between gap-3 text-left text-body-sm">
              <span className="truncate">{it.exception.label}</span>
              <RelativeDate value={it.expires_at} asOf={asOf} className="shrink-0 text-text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
