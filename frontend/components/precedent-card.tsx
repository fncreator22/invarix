import Link from "next/link";
import { RotateCcwClock } from "lucide-react";
import { formatShortDay } from "@/lib/format";
import type { Decision, Precedent } from "@/lib/types";
import { cn } from "@/lib/utils";

const DECISION_PAST: Record<Decision, string> = {
  renew: "renewed",
  revoke: "revoked",
  close: "closed",
  reassign: "reassigned",
  defer: "deferred",
};

/** 05 §8 PrecedentCard: "Last time (12 Sep): renewed twice, then revoked". */
export function PrecedentCard({
  precedent,
  href,
  className,
}: {
  precedent: Precedent;
  href?: string;
  className?: string;
}) {
  const depth = precedent.renewal_depth;
  const history =
    depth && depth > 1
      ? `renewed ${depth === 2 ? "twice" : `${depth} times`}, then ${DECISION_PAST[precedent.decision]}`
      : DECISION_PAST[precedent.decision];
  return (
    <article className={cn("flex gap-3 rounded-none border border-border-subtle bg-surface p-4", className)}>
      <RotateCcwClock aria-hidden className="mt-0.5 size-4 shrink-0 text-text-secondary" />
      <div className="min-w-0 text-body-sm">
        <p className="text-text-primary">
          <span className="font-medium">Last time ({formatShortDay(precedent.decided_at)}):</span> {history}
          {precedent.same_service ? " on this service" : ""}
        </p>
        {precedent.note && <p className="mt-1 line-clamp-2 text-text-secondary">&ldquo;{precedent.note}&rdquo;</p>}
        {href && (
          <Link href={href} className="mt-2 inline-flex min-h-6 items-center text-brand hover:underline">
            View outcome
          </Link>
        )}
      </div>
    </article>
  );
}
