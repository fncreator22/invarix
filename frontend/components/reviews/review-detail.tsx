"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Ban, Check, CircleSlash, ClockArrowUp, Repeat, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { fromDay, toDay } from "@/components/exceptions/shared";
import { PageContainer, PageHeader } from "@/components/page-header";
import { PrecedentCard } from "@/components/precedent-card";
import { ProofPath } from "@/components/proof-path";
import { RelativeDate } from "@/components/relative-date";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useNowSeconds } from "@/lib/hooks";
import type { AlertOut, Decision, PersonRow, ReviewDetail as Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const DAY = 86400;
const DECISIONS: Record<Decision, { label: string; icon: LucideIcon; effect: string }> = {
  renew: { label: "Renew", icon: Repeat, effect: "Creates a successor exception with a new expiry, links the renewal, and marks this one renewed." },
  revoke: { label: "Revoke", icon: Ban, effect: "Ends the exception now. The waived control applies again." },
  close: { label: "Close", icon: CircleSlash, effect: "Closes the exception because it is no longer needed." },
  reassign: { label: "Reassign", icon: ArrowRightLeft, effect: "Moves ownership to another active person." },
  defer: { label: "Defer", icon: ClockArrowUp, effect: "Snoozes the alert for up to 30 days. Nothing else changes." },
};

/** SCR-P-12 detail: context, owner resolution, precedent, and the decision (04 FLOW-04). */
export function ReviewDetail({ id }: { id: string }) {
  const api = useApi();
  const { wsId, slug } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [effects, setEffects] = useState<string[]>();
  const review = useQuery({
    queryKey: ["review", wsId, id],
    queryFn: ({ signal }) => api<Review>(wsPath(wsId, `/reviews/${id}`), { signal }),
  });
  const alert = useQuery({
    queryKey: ["alert", wsId, review.data?.alert.id],
    queryFn: ({ signal }) => api<AlertOut>(wsPath(wsId, `/alerts/${review.data!.alert.id}`), { signal }),
    enabled: !!review.data,
  });

  if (review.isPending)
    return (
      <PageContainer>
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-96" />
      </PageContainer>
    );
  if (review.isError)
    return (
      <PageContainer>
        <p className="text-text-secondary">{errorMessage(review.error)}</p>
      </PageContainer>
    );
  const r = review.data;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link href={`/w/${slug}/reviews`} className="hover:underline">
            Reviews
          </Link>
        }
        title={r.alert.label}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 text-body-sm">
            <StatusChip status={r.status} />
            <span className="text-text-muted">
              Exception{" "}
              <Link href={`/w/${slug}/exceptions/${r.exception.id}`} className="text-brand hover:underline">
                {r.exception.label}
              </Link>{" "}
              · opened <RelativeDate value={r.opened_at} realTime />
            </span>
          </span>
        }
        actions={
          r.can_decide && (
            <Button onClick={() => setOpen(true)}>
              <Check aria-hidden /> Decide
            </Button>
          )
        }
      />

      {r.status === "decided" && r.decision && (
        <section className="card-e1 border-sev-low p-4 md:p-5" aria-label="Decision">
          <p className="font-medium">
            Decided: {DECISIONS[r.decision].label}
            {r.decided_at && (
              <span className="font-normal text-text-muted">
                {" "}
                · <RelativeDate value={r.decided_at} realTime />
              </span>
            )}
          </p>
          {r.decision_note && <p className="mt-1 text-text-secondary">{r.decision_note}</p>}
          {effects && (
            <ul className="mt-3 space-y-1 text-body-sm">
              {effects.map((e) => (
                <li key={e} className="flex gap-2">
                  <Check className="mt-0.5 size-4 text-sev-low" aria-hidden /> {e}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Section title="Context">
            <p className="text-body-lg">{r.rationale}</p>
            {alert.data && <ProofPath path={alert.data.proof} className="mt-4" />}
          </Section>
        </div>
        <div className="space-y-6 lg:col-span-5">
          <Section title="Who is accountable">
            <ol className="space-y-2">
              {r.assignees.map((a) => (
                <li key={a.person.id} className="flex items-center gap-3">
                  <span className="tabular text-caption text-text-muted">{a.rank}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{a.person.label}</span>
                    <span className="block text-caption text-text-muted">{a.reason}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Precedent">
            {r.precedent.length ? (
              <div className="space-y-3">
                {r.precedent.map((p) => (
                  <PrecedentCard key={p.outcome_id} precedent={p} />
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-text-muted">No past decisions on this control yet.</p>
            )}
          </Section>
        </div>
      </div>

      <DecisionDialog open={open} onClose={() => setOpen(false)} review={r} onDecided={setEffects} />
    </PageContainer>
  );
}

function DecisionDialog({
  open,
  onClose,
  review,
  onDecided,
}: {
  open: boolean;
  onClose: () => void;
  review: Review;
  onDecided: (effects: string[] | undefined) => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, asOf } = useWorkspace();
  const now = useNowSeconds();
  const today = asOf ?? now;
  const [decision, setDecision] = useState<Decision>("renew");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDay(today + 30 * DAY));
  const [owner, setOwner] = useState("");
  const people = useQuery({
    queryKey: ["people", wsId],
    queryFn: ({ signal }) => api<PersonRow[]>(wsPath(wsId, "/people"), { signal }),
    enabled: open && decision === "reassign",
  });

  const decide = useMutation({
    mutationFn: () =>
      api<Review>(wsPath(wsId, `/reviews/${review.id}/decide`), {
        method: "POST",
        ifMatch: review.version,
        body: {
          decision,
          note: note.trim(),
          new_expires_at: decision === "renew" ? fromDay(date) : undefined,
          defer_until: decision === "defer" ? fromDay(date) : undefined,
          new_owner_id: decision === "reassign" ? owner : undefined,
        },
      }),
    onSuccess: (r) => {
      qc.setQueryData(["review", wsId, review.id], r);
      onDecided(r.effects);
      for (const k of ["reviews", "alerts", "risk-summary", "exception"]) qc.invalidateQueries({ queryKey: [k, wsId] });
      toast.success("Decision recorded. Sentinel re-checks the graph in a few seconds.");
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const needsDate = decision === "renew" || decision === "defer";
  const maxDate = decision === "defer" ? toDay(today + 30 * DAY) : undefined;
  const valid =
    note.trim().length >= 10 && (!needsDate || (date > toDay(today) && (!maxDate || date <= maxDate))) && (decision !== "reassign" || owner);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) decide.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Decide this review</DialogTitle>
            <DialogDescription>{review.exception.label}</DialogDescription>
          </DialogHeader>
          <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <legend className="sr-only">Decision</legend>
            {(Object.keys(DECISIONS) as Decision[]).map((d) => {
              const { label, icon: Icon } = DECISIONS[d];
              return (
                <label
                  key={d}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-md border px-2 py-3 text-body-sm has-focus-visible:ring-2 has-focus-visible:ring-brand",
                    decision === d ? "border-brand bg-brand-soft" : "border-border-subtle hover:border-border-strong",
                  )}
                >
                  <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} className="sr-only" />
                  <Icon className="size-5" aria-hidden />
                  {label}
                </label>
              );
            })}
          </fieldset>

          {needsDate && (
            <div className="space-y-1.5">
              <Label htmlFor="decision-date">{decision === "renew" ? "New expiry" : "Defer until (max 30 days)"}</Label>
              <Input id="decision-date" type="date" min={toDay(today + DAY)} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}
          {decision === "reassign" && (
            <label className="block space-y-1.5">
              <span className="text-body-sm font-medium">New owner</span>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} required className="h-10 w-full rounded-md border border-border-strong bg-sunken px-2.5">
                <option value="">Pick a person</option>
                {people.data
                  ?.filter((p) => p.status === "active")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.teams[0] ? ` · ${p.teams[0].label}` : ""}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="decision-note">Note (required)</Label>
            <Textarea id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} minLength={10} required placeholder="Why this decision? Future reviewers will see it as precedent." />
          </div>
          <p className="rounded-md bg-sunken px-3 py-2 text-body-sm text-text-secondary">
            <span className="font-medium text-text-primary">What changes: </span>
            {DECISIONS[decision].effect}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={decide.isPending} disabled={!valid}>
              Confirm {DECISIONS[decision].label.toLowerCase()}
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
