"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Repeat } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { KIND_LABEL } from "@/components/exceptions/shared";
import { PageContainer, PageHeader } from "@/components/page-header";
import { RelativeDate } from "@/components/relative-date";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ExceptionOut, Ref, TimelineEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const ROLE_RANK = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 } as const;

/** SCR-P-07: status, relationships, renewal chain, alerts and timeline. */
export function ExceptionDetail({ id }: { id: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, slug, asOf, role } = useWorkspace();
  const base = `/w/${slug}`;
  const exc = useQuery({
    queryKey: ["exception", wsId, id],
    queryFn: ({ signal }) => api<ExceptionOut>(wsPath(wsId, `/exceptions/${id}`), { signal }),
  });
  const timeline = useQuery({
    queryKey: ["exception-timeline", wsId, id],
    queryFn: ({ signal }) => api<TimelineEvent[]>(wsPath(wsId, `/exceptions/${id}/timeline`), { signal }),
  });
  const activate = useMutation({
    mutationFn: () => api<ExceptionOut>(wsPath(wsId, `/exceptions/${id}/activate`), { method: "POST", ifMatch: exc.data?.version }),
    onSuccess: (e) => {
      qc.setQueryData(["exception", wsId, id], e);
      toast.success("Exception activated. Sentinel will re-check the graph.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (exc.isPending)
    return (
      <PageContainer>
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-72" />
      </PageContainer>
    );
  if (exc.isError)
    return (
      <PageContainer>
        <p className="text-text-secondary">{errorMessage(exc.error)}</p>
      </PageContainer>
    );
  const e = exc.data;
  const chainIdx = e.renewal_chain.indexOf(e.id);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link href={`${base}/exceptions`} className="hover:underline">
            Exceptions
          </Link>
        }
        title={e.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 text-body-sm">
            <StatusChip status={e.effective_status} date={e.expires_at} />
            <span className="text-text-muted">
              {KIND_LABEL[e.kind]} · severity {e.severity} · expires <RelativeDate value={e.expires_at} asOf={asOf} withDate />
            </span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            {e.status === "draft" && ROLE_RANK[role] >= ROLE_RANK.reviewer && (
              <Button loading={activate.isPending} onClick={() => activate.mutate()}>
                <Check aria-hidden /> Activate
              </Button>
            )}
            {e.open_alert_ids[0] && (
              <Button asChild variant="secondary">
                <Link href={`${base}/alerts/${e.open_alert_ids[0]}`}>
                  Start review <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Section title="Relationships">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
              <Rel label="Owner" refs={[e.owner]} />
              <Rel label="Approver" refs={e.approver ? [e.approver] : []} />
              <Rel label="Waives" refs={[e.control]} />
              <Rel label="Applies to" refs={e.services} />
              <Rel label="Compensating" refs={e.compensating_controls} empty="None. Severity 3+ exceptions should be mitigated." />
              <Rel label="Evidence" refs={e.evidence} />
            </dl>
            {e.description && <p className="mt-4 border-t border-border-subtle pt-3 text-text-secondary">{e.description}</p>}
          </Section>
          <Section title="Timeline">
            {timeline.data?.length ? (
              <ol className="space-y-3 border-l border-border-subtle pl-4">
                {timeline.data.map((t, i) => (
                  <li key={i} className="relative text-body-sm">
                    <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-brand" aria-hidden />
                    <span className="font-medium">{t.kind.replace(/[._]/g, " ")}</span>{" "}
                    <span className="text-text-muted">
                      · <RelativeDate value={t.at} realTime />
                    </span>
                    {t.summary && <p className="text-text-secondary">{t.summary}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-text-muted">{timeline.isPending ? "Loading…" : "No events yet."}</p>
            )}
          </Section>
        </div>
        <div className="space-y-6 lg:col-span-5">
          <Section title={`Renewal chain (${e.renewal_chain.length})`}>
            {e.renewal_chain.length > 1 ? (
              <ol className="flex flex-wrap items-center gap-1.5">
                {e.renewal_chain.map((c, i) => (
                  <li key={c} className="flex items-center gap-1.5">
                    {i > 0 && <Repeat className="size-3.5 text-text-muted" aria-label="renewed as" />}
                    <Link
                      href={`${base}/exceptions/${c}`}
                      className={cn("rounded-full border px-2 py-0.5 font-mono text-caption", i === chainIdx ? "border-brand bg-brand-soft" : "border-border-subtle")}
                    >
                      #{i + 1}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-text-muted">Not renewed.</p>
            )}
            {e.renewal_chain.length >= 3 && <p className="mt-2 text-body-sm text-sev-moderate">Renewed {e.renewal_chain.length - 1} times: temporary is becoming permanent.</p>}
          </Section>
          <Section title={`Open alerts (${e.open_alert_ids.length})`}>
            {e.open_alert_ids.length ? (
              <ul className="space-y-1.5">
                {e.open_alert_ids.map((a) => (
                  <li key={a}>
                    <Link href={`${base}/alerts/${a}`} className="text-brand hover:underline">
                      View alert {a.slice(-6)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-text-muted">None.</p>
            )}
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function Rel({ label, refs, empty = "—" }: { label: string; refs: Ref[]; empty?: string }) {
  const { open } = useEntityDrawer();
  return (
    <>
      <dt className="text-body-sm text-text-muted">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {refs.length
          ? refs.map((r) => (
              <button key={r.id} type="button" onClick={() => open(r.id)} className="rounded-full border border-border-subtle px-2.5 py-0.5 text-body-sm hover:border-brand">
                {r.label ?? r.id}
              </button>
            ))
          : <span className="text-body-sm text-text-muted">{empty}</span>}
      </dd>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-e1 p-4 md:p-5" aria-label={title}>
      <h2 className="mb-3 font-sans text-h3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
