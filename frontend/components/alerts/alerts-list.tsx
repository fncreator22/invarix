"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { RelativeDate } from "@/components/relative-date";
import { RULES, RuleChip } from "@/components/rule-chip";
import { ScoreRing } from "@/components/score-ring";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { AlertOut, Page, RuleId } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const FILTERS = {
  status: { label: "Status", options: { "open,acknowledged,snoozed": "Open", open: "Open only", snoozed: "Snoozed", resolved: "Resolved" } },
  severity: { label: "Severity", options: { "": "All severities", critical: "Critical", high: "High", moderate: "Moderate", low: "Low" } },
  rule: {
    label: "Rule",
    options: { "": "All rules", ...Object.fromEntries(Object.entries(RULES).map(([k, v]) => [k, `${k} ${v.short}`])) },
  },
} as const;
type FilterKey = keyof typeof FILTERS;
// Literal class names so Tailwind can see them.
const SEV_BAR = { low: "bg-sev-low", moderate: "bg-sev-moderate", high: "bg-sev-high", critical: "bg-sev-critical" } as const;

/** SCR-P-03: alerts with filters in the URL (04 §8). */
export function AlertsList() {
  const api = useApi();
  const { wsId, slug, asOf } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = (k: FilterKey) => params.get(k) ?? (k === "status" ? "open,acknowledged,snoozed" : "");
  const filters = { status: value("status"), severity: value("severity"), rule: value("rule") };

  const q = useInfiniteQuery({
    queryKey: ["alerts", wsId, filters],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<Page<AlertOut>>(wsPath(wsId, "/alerts"), {
        signal,
        query: { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), limit: 25, cursor: pageParam || undefined },
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const alerts = q.data?.pages.flatMap((p) => p.items) ?? [];

  const setFilter = (k: FilterKey, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  return (
    <PageContainer className="space-y-4 py-4">
      <PageHeader title="Alerts" />
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 bg-canvas/90 px-1 py-2 backdrop-blur">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
          <label key={k} className="relative text-body-sm">
            <span className="sr-only">{FILTERS[k].label}</span>
            <select
              value={filters[k]}
              onChange={(e) => setFilter(k, e.target.value)}
              className="h-9 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-body-sm text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 cursor-pointer"
            >
              {Object.entries(FILTERS[k].options).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ))}
        {(filters.severity || filters.rule || filters.status !== "open,acknowledged,snoozed") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams();
              router.replace(`${pathname}?${next}`, { scroll: false });
            }}
            className="h-9 text-text-muted hover:text-text-primary text-caption"
          >
            Clear filters
          </Button>
        )}
      </div>

      {q.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="card-e1 p-5 text-body-sm">
          <p className="text-text-secondary">{errorMessage(q.error)}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title={asOf ? `All clear as of ${new Date(asOf * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "All clear"}
          description="Sentinel checks every exception against eight relationship rules after each change. Nothing matches these filters."
          action={
            (filters.severity || filters.rule || filters.status !== "open,acknowledged,snoozed") ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = new URLSearchParams();
                  router.replace(`${pathname}?${next}`, { scroll: false });
                }}
              >
                Reset all filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="card-e1 divide-y divide-border-subtle overflow-hidden" aria-label="Alerts">
          {alerts.map((a) => (
            <li key={a.id}>
              <Link href={`/w/${slug}/alerts/${a.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-soft">
                <span className={`h-10 w-1 shrink-0 rounded-full ${SEV_BAR[a.severity]}`} aria-hidden />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <RuleChip rule={a.rule_id as RuleId} compact />
                    {a.status !== "open" && <StatusChip status={a.status} date={a.snoozed_until ?? undefined} />}
                  </span>
                  <span className="block truncate font-medium">{a.title}</span>
                  <span className="block truncate text-caption text-text-muted">
                    {a.subject.kind} · {a.subject.label} · opened <RelativeDate value={a.created_at} realTime />
                  </span>
                </span>
                {a.score != null && <ScoreRing score={a.score} size="sm" className="hidden sm:flex" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
