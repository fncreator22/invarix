"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { IdText } from "@/components/id-text";
import { entityMeta, entityRoute } from "@/components/entity-meta";
import { takeDrawerTrigger, useEntityDrawer } from "@/components/shell/use-drawer";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useWorkspace } from "@/lib/workspace";

// ID prefix → registry collection (03 §2.1, §10.2).
const COLLECTION: Record<string, string> = {
  svc: "services",
  per: "people",
  team: "teams",
  ctl: "controls",
  cc: "compensating-controls",
  cp: "customer-paths",
  rbk: "runbooks",
  ev: "evidence",
  exc: "exceptions",
  alt: "alerts",
  rev: "reviews",
};

type AnyEntity = { id: string; name?: string; title?: string; label?: string; props?: Record<string, unknown> } & Record<
  string,
  unknown
>;

function displayValue(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") {
    const r = v as { label?: string; name?: string; id?: string };
    return r.label ?? r.name ?? r.id ?? null;
  }
  return String(v);
}

/**
 * Shared entity drawer frame (04 §3, §8), opened by `?drawer=<id>`. Closes with Esc and returns focus
 * to the trigger. Rich per-type bodies arrive with the product screens.
 */
export function EntityDrawer() {
  const { id, close } = useEntityDrawer();
  const { wsId, slug } = useWorkspace();
  const api = useApi();
  const prefix = id?.split("_")[0] ?? "";
  const collection = COLLECTION[prefix];
  const q = useQuery({
    queryKey: ["entity", wsId, id],
    queryFn: ({ signal }) => api<AnyEntity>(wsPath(wsId, `/${collection}/${encodeURIComponent(id!)}`), { signal }),
    enabled: !!id && !!collection,
  });
  const meta = entityMeta(undefined, id ?? undefined);
  const Icon = meta.icon;
  const entity = q.data;
  const title = entity?.name ?? entity?.title ?? id ?? "";
  const fields = entity
    ? Object.entries({ ...(entity.props ?? {}), ...entity })
        .filter(([k]) => !["id", "name", "title", "props", "edges", "proof", "breakdown", "version"].includes(k))
        .map(([k, v]) => [k, displayValue(v)] as const)
        .filter((e): e is readonly [string, string] => e[1] !== null)
        .slice(0, 14)
    : [];
  const pageHref = id ? entityRoute(slug, meta.label, id) : null;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        onCloseAutoFocus={(e) => {
          const el = takeDrawerTrigger();
          if (el?.isConnected) {
            e.preventDefault();
            el.focus();
          }
        }}
      >
        <SheetHeader className="border-b border-border-subtle pr-12">
          <p className="flex items-center gap-1.5 eyebrow text-text-muted">
            <Icon aria-hidden className="size-3.5" />
            {meta.label}
          </p>
          <SheetTitle className="font-display text-h2">{q.isPending && collection ? <Skeleton className="h-7 w-48" /> : title}</SheetTitle>
          <SheetDescription asChild>
            <div>{id && <IdText id={id} full className="-ml-1" />}</div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {!collection ? (
            <p className="text-body-sm text-text-secondary">This kind of entity has no detail view yet.</p>
          ) : q.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-5" />
              ))}
            </div>
          ) : q.isError ? (
            <div className="space-y-3 text-body-sm">
              <p className="text-text-secondary">{errorMessage(q.error)}</p>
              <Button size="sm" variant="secondary" onClick={() => q.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-body-sm">
              {fields.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-text-muted first-letter:uppercase">{k.replace(/_/g, " ")}</dt>
                  <dd className="min-w-0 break-words text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {id && (
          <div className="flex flex-wrap gap-2 border-t border-border-subtle p-4">
            {pageHref && (
              <Button asChild size="sm">
                <Link href={pageHref}>
                  <ExternalLink aria-hidden />
                  Open full page
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="secondary">
              <Link href={`/w/${slug}/graph?focus=${encodeURIComponent(id)}`}>
                <Network aria-hidden />
                Show on graph
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
