"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, Search, UserCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";
import { RelativeDate } from "@/components/relative-date";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { PersonRow, ReviewPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { meQueryKey, rememberPerson, useWorkspace, workspaceQueryKey } from "@/lib/workspace";

const TABS = {
  mine: { label: "Assigned to me", query: { assigned_to_me: true, status: "pending" } },
  all: { label: "All open", query: { status: "draft,pending" } },
  decided: { label: "Decided", query: { status: "decided,cancelled" } },
} as const;
type Tab = keyof typeof TABS;

/** SCR-P-12 inbox: tabs live in the URL (?tab=). */
export function ReviewsInbox() {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, slug } = useWorkspace();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) in TABS ? (params.get("tab") as Tab) : "mine";

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [searchPerson, setSearchPerson] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const q = useInfiniteQuery({
    queryKey: ["reviews", wsId, tab],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<ReviewPage>(wsPath(wsId, "/reviews"), { signal, query: { ...TABS[tab].query, limit: 25, cursor: pageParam || undefined } }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const needsIdentity = q.data?.pages[0]?.needs_identity;

  const peopleQuery = useQuery({
    queryKey: ["people", wsId],
    queryFn: ({ signal }) => api<PersonRow[]>(wsPath(wsId, "/people"), { signal }),
    enabled: linkDialogOpen || !!needsIdentity,
  });

  const linkMutation = useMutation({
    mutationFn: (personId: string) =>
      api<void>(wsPath(wsId, "/link-person"), {
        method: "POST",
        body: { person_id: personId },
      }),
    onSuccess: (_, personId) => {
      rememberPerson(wsId, personId);
      const p = peopleQuery.data?.find((x) => x.id === personId);
      toast.success(p ? `Profile linked to ${p.name}` : "Profile linked successfully");
      void qc.invalidateQueries({ queryKey: ["reviews", wsId] });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      void qc.invalidateQueries({ queryKey: workspaceQueryKey(wsId) });
      setLinkDialogOpen(false);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
    },
  });

  const activePeople = (peopleQuery.data ?? []).filter(
    (p) =>
      p.status === "active" &&
      (!searchPerson ||
        p.name.toLowerCase().includes(searchPerson.toLowerCase()) ||
        (p.title && p.title.toLowerCase().includes(searchPerson.toLowerCase())))
  );

  return (
    <PageContainer className="space-y-4 py-4">
      <PageHeader
        title="Reviews"
        subtitle="Active governance reviews and architectural waiver decisions."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            className="text-xs gap-1.5"
          >
            <UserCheck className="size-3.5" />
            <span>Link profile</span>
          </Button>
        }
      />
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
          description="Reviews are assigned to people in the org graph. Tell INVARIX which person you are."
          action={
            <Button onClick={() => setLinkDialogOpen(true)}>
              <UserCheck className="size-4 mr-2" />
              Link my profile
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

      {/* Interactive Link Person Modal without page reload */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Your Person Record</DialogTitle>
            <DialogDescription>
              Select your persona in the workspace graph to see reviews assigned directly to you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                type="search"
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                placeholder="Search teammates (e.g. Alex, Sarah, Marcus)..."
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {peopleQuery.isPending ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : activePeople.length === 0 ? (
                <div className="p-4 text-center text-body-sm text-text-muted">
                  No active people found.
                </div>
              ) : (
                activePeople.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPersonId(p.id)}
                      className={cn(
                        "w-full text-left flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer",
                        isSelected ? "bg-brand-soft text-brand" : "hover:bg-brand-soft/50 text-text-primary"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-body-sm truncate">{p.name}</span>
                          {p.role && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken border border-border-subtle uppercase">
                              {p.role}
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-text-muted truncate">
                          {p.title || p.email || "Active Team Member"}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {p.owned_active > 0 && (
                          <span className="text-[11px] font-mono text-text-muted">
                            {p.owned_active} exc
                          </span>
                        )}
                        <div
                          className={cn(
                            "size-4 rounded-full border flex items-center justify-center transition-colors",
                            isSelected ? "border-brand bg-brand text-white" : "border-border-default"
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedPersonId}
              loading={linkMutation.isPending}
              onClick={() => {
                if (selectedPersonId) linkMutation.mutate(selectedPersonId);
              }}
            >
              This is me
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
