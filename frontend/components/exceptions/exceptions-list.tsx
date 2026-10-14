"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ClipboardPaste, FileWarning, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { KIND_LABEL } from "@/components/exceptions/shared";
import { PageContainer, PageHeader } from "@/components/page-header";
import { RelativeDate } from "@/components/relative-date";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ExceptionOut, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const STATUS = { "": "Any status", active: "Active", expiring: "Expiring", expired: "Expired", draft: "Draft", renewed: "Renewed", revoked: "Revoked", closed: "Closed" };
const SEVERITY = { "": "Any severity", "5": "Severity 5", "4": "Severity 4", "3": "Severity 3", "2": "Severity 2", "1": "Severity 1" };

/** SCR-P-05: the exception registry, filterable by URL (status, effective status, kind, severity, q). */
export function ExceptionsList() {
  const api = useApi();
  const { wsId, slug, asOf } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const keys = ["effective_status", "status", "kind", "severity", "expiring_within_days", "q"] as const;
  const filters = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<(typeof keys)[number], string>;

  const q = useInfiniteQuery({
    queryKey: ["exceptions", wsId, filters],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<Page<ExceptionOut>>(wsPath(wsId, "/exceptions"), {
        signal,
        query: { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), limit: 25, cursor: pageParam || undefined },
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const select = (k: string, options: Record<string, string>, label: string) => (
    <label className="relative text-body-sm">
      <span className="sr-only">{label}</span>
      <select
        value={filters[k as keyof typeof filters]}
        onChange={(e) => set(k, e.target.value)}
        className="h-9 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-body-sm text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 cursor-pointer"
      >
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  const hasActiveFilters = Boolean(
    filters.q || filters.effective_status || filters.kind || filters.severity || filters.expiring_within_days
  );

  return (
    <PageContainer>
      <PageHeader
        title="Exceptions"
        subtitle="Every temporary promise: who owns it, what it waives, where it applies, when it ends."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/w/${slug}/exceptions/drafts`}>
                <ClipboardPaste aria-hidden className="size-4" /> Paste text
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/w/${slug}/exceptions/new`}>
                <Plus aria-hidden className="size-4" /> New exception
              </Link>
            </Button>
          </div>
        }
      />
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 bg-canvas/90 px-1 py-2 backdrop-blur">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <input
            defaultValue={filters.q}
            onKeyDown={(e) => e.key === "Enter" && set("q", e.currentTarget.value.trim())}
            onBlur={(e) => set("q", e.currentTarget.value.trim())}
            placeholder="Search title or ID"
            className="h-9 w-56 rounded-md border border-border-subtle bg-surface pl-8 pr-3 text-body-sm text-text-primary placeholder:text-text-muted transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          />
        </label>
        {select("effective_status", STATUS, "Status")}
        {select("kind", { "": "Any kind", ...KIND_LABEL }, "Kind")}
        {select("severity", SEVERITY, "Severity")}
        {filters.expiring_within_days && (
          <Button variant="ghost" size="sm" onClick={() => set("expiring_within_days", "")}>
            Expiring within {filters.expiring_within_days} days ✕
          </Button>
        )}
        {hasActiveFilters && (
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
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : q.isError ? (
        <p className="text-text-secondary">{errorMessage(q.error)}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={FileWarning} title="No exceptions match" description="Add one, or paste a ticket or chat thread and let Reprieve draft it." />
      ) : (
        <div className="card-e1 overflow-x-auto">
          <table className="w-full min-w-[720px] text-body-sm">
            <thead className="bg-sunken text-left text-text-muted">
              <tr>
                {["Exception", "Status", "Sev", "Expires", "Owner", "Services", "Alerts"].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((e) => (
                <tr key={e.id} className="hover:bg-brand-soft">
                  <td className="max-w-80 px-4 py-2.5">
                    <Link href={`/w/${slug}/exceptions/${e.id}`} className="block truncate font-medium hover:underline">
                      {e.title}
                    </Link>
                    <span className="text-caption text-text-muted">{KIND_LABEL[e.kind]}</span>
                  </td>
                  <td className="px-4">
                    <StatusChip status={e.effective_status} date={e.expires_at} />
                  </td>
                  <td className="tabular px-4">{e.severity}</td>
                  <td className="px-4 whitespace-nowrap">
                    <RelativeDate value={e.expires_at} asOf={asOf} />
                  </td>
                  <td className="px-4">{e.owner.label}</td>
                  <td className="max-w-48 truncate px-4 text-text-secondary">{e.services.map((s) => s.label).join(", ")}</td>
                  <td className="tabular px-4">{e.open_alert_ids.length || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
