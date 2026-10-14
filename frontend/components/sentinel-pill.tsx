"use client";

import { Radar, RotateCw, TriangleAlert } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { useNowSeconds } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export type SentinelState = "idle" | "running" | "failed";

/** 05 §8 SentinelPill: idle "up to date 2m ago", running sweep + shimmer, failed with retry. */
export function SentinelPill({
  state,
  lastRunAt,
  onRetry,
  className,
}: {
  state: SentinelState;
  /** Real time of the last finished run, epoch seconds. */
  lastRunAt?: number | null;
  onRetry?: () => void;
  className?: string;
}) {
  const now = useNowSeconds();
  const base = "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium whitespace-nowrap";
  if (state === "failed") {
    return (
      <span role="status" className={cn(base, "border-warning/50 bg-warning-soft text-warning", className)}>
        <TriangleAlert aria-hidden className="size-3.5" />
        Sentinel run failed
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="-mr-1 ml-0.5 inline-flex size-6 items-center justify-center rounded-full hover:bg-warning-soft"
            aria-label="Retry Sentinel run"
          >
            <RotateCw aria-hidden className="size-3.5" />
          </button>
        )}
      </span>
    );
  }
  const running = state === "running";
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        base,
        "relative overflow-hidden border-border-subtle bg-surface text-text-secondary",
        running && "border-proof/40 text-proof",
        className,
      )}
    >
      {running && <span aria-hidden className="pointer-events-none absolute inset-0 skeleton-shimmer opacity-40" />}
      <Radar aria-hidden className={cn("relative size-3.5", running && "motion-safe:animate-radar")} />
      <span className="relative">
        Sentinel ·{" "}
        {running ? "running…" : lastRunAt ? `up to date ${formatRelative(lastRunAt, now)}` : "not run yet"}
      </span>
    </span>
  );
}
