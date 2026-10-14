"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { entityRoute } from "@/components/entity-meta";
import { useMarkNotificationsRead, useNotifications } from "@/components/shell/use-shell-data";
import { formatRelative } from "@/lib/format";
import { useNowSeconds } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

/** In-app notifications popover (04 §5.4, FR-ALR-07). */
export function NotificationsBell() {
  const { slug } = useWorkspace();
  const q = useNotifications();
  const mark = useMarkNotificationsRead();
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  const now = useNowSeconds();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative">
          <Bell aria-hidden className="size-5" strokeWidth={1.5} />
          {unread > 0 && <span aria-hidden className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-surface" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="font-sans text-body font-semibold">Notifications</h2>
          {unread > 0 && (
            <Button variant="link" size="sm" onClick={() => mark.mutate("all")}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {q.isPending ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : q.isError ? (
            <p className="p-4 text-body-sm text-text-secondary">
              We couldn&apos;t load notifications.{" "}
              <button type="button" className="text-brand hover:underline" onClick={() => q.refetch()}>
                Try again
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-body-sm text-text-secondary">You&apos;re all caught up.</p>
          ) : (
            <ul>
              {items.map((n) => {
                const href = n.ref_kind && n.ref_id ? entityRoute(slug, n.ref_kind, n.ref_id) : null;
                const body = (
                  <>
                    {!n.read_at && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                    <span className={cn("min-w-0 flex-1", n.read_at && "pl-4")}>
                      <span className="block text-body-sm font-medium text-text-primary">{n.title}</span>
                      {n.body && <span className="block truncate text-body-sm text-text-secondary">{n.body}</span>}
                      <span className="block text-caption text-text-muted">{formatRelative(n.created_at, now)}</span>
                    </span>
                    {!n.read_at && <span className="sr-only">Unread</span>}
                  </>
                );
                const cls = "flex w-full gap-2 border-b border-border-subtle px-4 py-3 text-left last:border-0 hover:bg-brand-soft";
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link href={href} className={cls} onClick={() => !n.read_at && mark.mutate(n.id)}>
                        {body}
                      </Link>
                    ) : (
                      <button type="button" className={cls} onClick={() => !n.read_at && mark.mutate(n.id)}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
