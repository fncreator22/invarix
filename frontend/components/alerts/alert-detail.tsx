"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, Check, CheckCheck, ClipboardCheck, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/page-header";
import { PrecedentCard } from "@/components/precedent-card";
import { ProofPath } from "@/components/proof-path";
import { RelativeDate } from "@/components/relative-date";
import { RULES, RuleChip } from "@/components/rule-chip";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { SeverityBadge } from "@/components/severity-badge";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { AlertOut, Assignee, ExceptionOut, Precedent, ReviewOut } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const REASON_LABEL: Record<Assignee["reason_code"], string> = {
  owner_valid: "Owner",
  team_lead: "Team lead",
  approver: "Approver",
  workspace_admin: "Admin",
};
const ROLE_RANK = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 } as const;
const DAY = 86400;

/** SCR-P-04: why it fired, the proof, the score, precedent, and what to do next. */
export function AlertDetail({ id }: { id: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, slug, role, asOf } = useWorkspace();
  const { open } = useEntityDrawer();
  const base = `/w/${slug}`;
  const canAct = ROLE_RANK[role] >= ROLE_RANK.reviewer;
  const [dialog, setDialog] = useState<null | "review" | "snooze" | "resolve">(null);

  const alert = useQuery({
    queryKey: ["alert", wsId, id],
    queryFn: ({ signal }) => api<AlertOut>(wsPath(wsId, `/alerts/${id}`), { signal }),
  });
  const explain = useQuery({
    queryKey: ["alert-explain", wsId, id, alert.data?.version],
    queryFn: ({ signal }) => api<{ text: string; source: "ai" | "deterministic" }>(wsPath(wsId, `/alerts/${id}/explain`), { signal }),
    enabled: !!alert.data,
    retry: false,
  });
  const firstExc = alert.data?.involved[0]?.id;
  const exception = useQuery({
    queryKey: ["exception", wsId, firstExc],
    queryFn: ({ signal }) => api<ExceptionOut>(wsPath(wsId, `/exceptions/${firstExc}`), { signal }),
    enabled: !!firstExc,
  });
  const precedent = useQuery({
    queryKey: ["precedent", wsId, exception.data?.control.id],
    queryFn: ({ signal }) =>
      api<Precedent[]>(wsPath(wsId, "/memory/precedent"), {
        signal,
        query: { control_id: exception.data!.control.id, service_id: exception.data!.services[0]?.id },
      }),
    enabled: !!exception.data,
  });

  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) =>
      api<AlertOut>(wsPath(wsId, `/alerts/${id}/${path}`), { method: "POST", body, ifMatch: alert.data?.version }),
    onSuccess: (a, { path }) => {
      qc.setQueryData(["alert", wsId, id], a);
      qc.invalidateQueries({ queryKey: ["alerts", wsId] });
      qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
      setDialog(null);
      toast.success(path === "feedback" ? "Thanks, feedback saved." : `Alert ${a.status}.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (alert.isPending) return <DetailSkeleton />;
  if (alert.isError)
    return (
      <PageContainer>
        <p className="text-text-secondary">{errorMessage(alert.error)}</p>
      </PageContainer>
    );
  const a = alert.data;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link href={`${base}/alerts`} className="hover:underline">
            Alerts
          </Link>
        }
        title={a.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={a.severity} />
            <RuleChip rule={a.rule_id} />
            <StatusChip status={a.status} date={a.snoozed_until ?? undefined} />
            <span className="text-body-sm text-text-muted">
              About{" "}
              <button type="button" onClick={() => open(a.subject.id)} className="text-brand hover:underline">
                {a.subject.label}
              </button>{" "}
              · opened <RelativeDate value={a.created_at} realTime />
            </span>
          </span>
        }
        actions={
          canAct &&
          a.status !== "resolved" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDialog("review")}>
                <ClipboardCheck aria-hidden /> Propose review
              </Button>
              {a.status === "open" && (
                <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate({ path: "acknowledge" })}>
                  <Check aria-hidden /> Acknowledge
                </Button>
              )}
              <Button variant="ghost" onClick={() => setDialog("snooze")}>
                <BellOff aria-hidden /> Snooze
              </Button>
              <Button variant="ghost" onClick={() => setDialog("resolve")}>
                <CheckCheck aria-hidden /> Resolve
              </Button>
            </div>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Section title="Why it fired">
            {explain.isPending ? (
              <Skeleton className="h-16" />
            ) : (
              <p className="whitespace-pre-line text-body-lg leading-relaxed">{explain.data?.text ?? a.summary}</p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-caption text-text-muted">
              {explain.data?.source === "ai" && <Sparkles className="size-3.5 text-brand" aria-hidden />}
              {explain.data?.source === "ai" ? "Summary by Steward, checked against the proof path." : RULES[a.rule_id].name}
            </p>
          </Section>
          <Section title="Proof path">
            <ProofPath path={a.proof} />
          </Section>
          <Section title={`Contributing exceptions (${a.involved.length})`}>
            <ul className="divide-y divide-border-subtle">
              {a.involved.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`${base}/exceptions/${e.id}`} className="truncate hover:underline">
                    {e.label}
                  </Link>
                  <button type="button" onClick={() => open(e.id)} className="shrink-0 text-caption text-brand hover:underline">
                    Details
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="space-y-6 lg:col-span-5">
          {a.breakdown && (
            <Section title="Score breakdown">
              <ScoreBreakdown breakdown={a.breakdown} names={Object.fromEntries(a.involved.map((e) => [e.id, e.label ?? e.id]))} />
            </Section>
          )}
          <Section title="Precedent">
            {precedent.data?.length ? (
              <div className="space-y-3">
                {precedent.data.map((p) => (
                  <PrecedentCard key={p.outcome_id} precedent={p} />
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-text-muted">
                {precedent.isPending && exception.isPending ? "Looking up past decisions…" : "No past decisions on this control yet."}
              </p>
            )}
          </Section>
          <Section title="Was this alert useful?">
            <div className="flex gap-2">
              {[true, false].map((useful) => (
                <Button
                  key={String(useful)}
                  variant={a.feedback === (useful ? "useful" : "not_useful") ? "default" : "secondary"}
                  size="sm"
                  onClick={() => act.mutate({ path: "feedback", body: { useful } })}
                >
                  {useful ? <ThumbsUp aria-hidden /> : <ThumbsDown aria-hidden />} {useful ? "Useful" : "Not useful"}
                </Button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <ProposeReviewDialog open={dialog === "review"} onClose={() => setDialog(null)} alert={a} />
      <NoteDialog
        open={dialog === "snooze"}
        onClose={() => setDialog(null)}
        title="Snooze alert"
        description="It comes back automatically on the date you pick."
        withDate
        minDate={(asOf ?? 0) + DAY}
        loading={act.isPending}
        onSubmit={(note, until) => act.mutate({ path: "snooze", body: { reason: note, until } })}
      />
      <NoteDialog
        open={dialog === "resolve"}
        onClose={() => setDialog(null)}
        title="Resolve alert"
        description="If the condition still holds, Sentinel will reopen it on the next run."
        loading={act.isPending}
        onSubmit={(note) => act.mutate({ path: "resolve", body: { note } })}
      />
    </PageContainer>
  );
}

function ProposeReviewDialog({ open, onClose, alert }: { open: boolean; onClose: () => void; alert: AlertOut }) {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { wsId, slug } = useWorkspace();
  const [exc, setExc] = useState(alert.involved[0]?.id ?? "");
  const cands = useQuery({
    queryKey: ["owner-candidates", wsId, alert.id, exc],
    queryFn: ({ signal }) => api<Assignee[]>(wsPath(wsId, `/alerts/${alert.id}/owner-candidates`), { signal, query: { exception_id: exc } }),
    enabled: open && !!exc,
  });
  const create = useMutation({
    mutationFn: () => api<ReviewOut>(wsPath(wsId, `/alerts/${alert.id}/propose-review`), { method: "POST", body: { exception_id: exc } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["reviews", wsId] });
      toast.success("Review opened and assigned.");
      router.push(`/w/${slug}/reviews/${r.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a review</DialogTitle>
          <DialogDescription>Routed to the current accountable person, in this order.</DialogDescription>
        </DialogHeader>
        {alert.involved.length > 1 && (
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium">Exception to review</span>
            <select value={exc} onChange={(e) => setExc(e.target.value)} className="h-10 w-full rounded-md border border-border-strong bg-sunken px-2.5">
              {alert.involved.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <ol className="space-y-2" aria-label="Ranked assignees">
          {cands.isPending
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)
            : cands.data?.map((c) => (
                <li key={c.person.id} className="flex items-center gap-3 rounded-md border border-border-subtle px-3 py-2">
                  <span className="tabular text-caption text-text-muted">{c.rank}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.person.label}</span>
                    <span className="block text-caption text-text-muted">{c.reason}</span>
                  </span>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-caption">{REASON_LABEL[c.reason_code]}</span>
                </li>
              ))}
        </ol>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} disabled={!cands.data?.length} onClick={() => create.mutate()}>
            Open review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({
  open,
  onClose,
  title,
  description,
  withDate,
  minDate = 0,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  withDate?: boolean;
  minDate?: number;
  loading: boolean;
  onSubmit: (note: string, until: number) => void;
}) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const min = new Date(minDate * 1000).toISOString().slice(0, 10);
  const valid = note.trim().length >= 3 && (!withDate || date >= min);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSubmit(note.trim(), Date.parse(`${date}T00:00:00Z`) / 1000);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {withDate && (
            <div className="space-y-1.5">
              <Label htmlFor="until">Until</Label>
              <Input id="until" type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="note">{withDate ? "Reason" : "Note"}</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} required minLength={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function DetailSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="h-16 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    </PageContainer>
  );
}
