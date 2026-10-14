import { SeverityBadge } from "@/components/severity-badge";
import type { ScoreBreakdown as Breakdown } from "@/lib/types";
import { cn } from "@/lib/utils";

// Segment fills for the stacked bar; patterns repeat after five (labels carry identity, not color).
const SEGMENTS = ["bg-brand", "bg-proof", "bg-sev-high", "bg-sev-moderate", "bg-text-muted"];

function Formula({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div className="rounded-md bg-sunken px-3 py-2 font-mono text-[12px] leading-relaxed text-text-secondary">
      score = 100 × (1 − e<sup>−raw × mult / K</sup>)
      <br />
      raw <span className="text-text-primary">{breakdown.raw.toFixed(2)}</span> · mult <span className="text-text-primary">×{breakdown.multiplier}</span>
      {breakdown.rule_hits.length > 0 && <> ({breakdown.rule_hits.join(", ")})</>} → <span className="text-text-primary">{Math.round(breakdown.score)}</span>
    </div>
  );
}

/**
 * Per-exception contributions (05 §8 ScoreBreakdown). Default: labelled bars + formula.
 * `compact`: one stacked bar + top contributors, formula folded away. Overdue segments are hatched.
 */
export function ScoreBreakdown({
  breakdown,
  names = {},
  limit = 6,
  compact = false,
  className,
}: {
  breakdown: Breakdown;
  names?: Record<string, string>;
  limit?: number;
  compact?: boolean;
  className?: string;
}) {
  const all = breakdown.contributions;
  const total = all.reduce((a, c) => a + c.value, 0) || 1;
  const items = all.slice(0, limit);
  const max = Math.max(...items.map((c) => c.value), 0.0001);
  const rest = all.length - items.length;

  if (compact) {
    const top = all.slice(0, 4);
    const other = total - top.reduce((a, c) => a + c.value, 0);
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex h-4 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`Raw risk ${breakdown.raw.toFixed(1)} from ${all.length} exceptions`}>
          {top.map((c, i) => (
            <span key={c.exception_id} className={cn("h-full border-r border-surface", SEGMENTS[i], c.overdue > 1 && "hatched")} style={{ width: `${(c.value / total) * 100}%` }} />
          ))}
          {other > 0 && <span className="h-full bg-border-strong" style={{ width: `${(other / total) * 100}%` }} />}
        </div>
        <ul className="grid gap-x-4 gap-y-1.5 text-body-sm sm:grid-cols-2">
          {top.map((c, i) => (
            <li key={c.exception_id} className="flex min-w-0 items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-sm", SEGMENTS[i])} aria-hidden />
              <span className="truncate">{names[c.exception_id] ?? c.exception_id}</span>
              <span className="tabular ml-auto shrink-0 font-mono text-caption text-text-muted">{Math.round((c.value / total) * 100)}%</span>
            </li>
          ))}
          {all.length > top.length && (
            <li className="flex items-center gap-2 text-text-muted">
              <span className="size-2.5 shrink-0 rounded-sm bg-border-strong" aria-hidden />+{all.length - top.length} smaller
            </li>
          )}
        </ul>
        <details className="text-body-sm">
          <summary className="cursor-pointer select-none text-caption text-text-muted hover:text-text-primary">How is this scored?</summary>
          <Formula breakdown={breakdown} />
        </details>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <ol className="space-y-2.5" aria-label="Contribution by exception">
        {items.map((c) => (
          <li key={c.exception_id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="truncate">{names[c.exception_id] ?? c.exception_id}</span>
              <span className="tabular shrink-0 font-mono text-text-secondary">{c.value.toFixed(1)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-sunken">
              <div className={cn("h-full rounded-full bg-brand", c.overdue > 1 && "hatched")} style={{ width: `${(c.value / max) * 100}%` }} />
            </div>
            <p className="text-caption text-text-muted">
              {c.hops === 0 ? "On this service" : `${c.hops} hop${c.hops > 1 ? "s" : ""} away`}
              {c.overdue > 1 && " · overdue ×" + c.overdue}
              {c.centrality > 0 && ` · centrality ${c.centrality.toFixed(2)}`}
            </p>
          </li>
        ))}
      </ol>
      {rest > 0 && <p className="text-caption text-text-muted">+{rest} smaller contributions</p>}
      <Formula breakdown={breakdown} />
      <SeverityBadge severity={breakdown.band} />
    </div>
  );
}
