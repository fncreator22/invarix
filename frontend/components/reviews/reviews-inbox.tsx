"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { RelativeDate } from "@/components/relative-date";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ReviewPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const TABS = {
  mine: { label: "Assigned to me", query: { assigned_to_me: true, status: "pending" } },
  all: { label: "All open", query: { status: "draft,pending" } },
  decided: { label: "Decided", query: { status: "decided,cancelled" } },
} as const;
type Tab = keyof typeof TABS;

/** SCR-P-12 inbox: tabs live in the URL (?tab=). */
export function ReviewsInbox() {
  const api = useApi();
  const { wsId, slug } = useWorkspace();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) in TABS ? (params.get("tab") as Tab) : "mine";

  const q = useInfiniteQuery({
    queryKey: ["reviews", wsId, tab],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<ReviewPage>(wsPath(wsId, "/reviews"), { signal, query: { ...TABS[tab].query, limit: 25, cursor: pageParam || undefined } }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const needsIdentity = q.data?.pages[0]?.needs_identity;

  return (
    <PageContainer className="space-y-4 py-4">
      <PageHeader title="Reviews" />
      <nav className="flex gap-1 border-b border-border-subtle" aria-label="Review tabs">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-body-sm font-medium",
              t === tab ? "border-brand text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {TABS[t].label}
          </Link>
        ))}
      </nav>

      {needsIdentity ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Link your profile to see your reviews"
          description="Reviews are assigned to people in the org graph. Tell Reprieve which person you are."
          action={
            <Button asChild>
              <Link href="/onboarding">Link my profile</Link>
            </Button>
          }
        />
      ) : q.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : q.isError ? (
        <p className="text-text-secondary">{errorMessage(q.error)}</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={tab === "mine" ? "No reviews pending your approval" : "No reviews found"}
          description="Open an alert and select Propose Review to route an architectural exception decision."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={`/w/${slug}/alerts`}>View active alerts</Link>
            </Button>
          }
        />
      ) : (
        <ul className="card-e1 divide-y divide-border-subtle overflow-hidden">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/w/${slug}/reviews/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-soft">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.alert.label}</span>
                  <span className="block truncate text-caption text-text-muted">
                    {r.exception.label}
                    {r.assignees[0] && ` · ${r.assignees[0].person.label} (${r.assignees[0].reason.toLowerCase()})`}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <StatusChip status={r.status} />
                  <span className="text-caption text-text-muted">
                    {r.decision ? `${r.decision} · ` : ""}
                    <RelativeDate value={r.decided_at ?? r.opened_at} realTime />
                  </span>
                </span>
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
