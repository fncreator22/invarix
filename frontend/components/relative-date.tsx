"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatAbsolute, formatRelative, formatShortDay, toDate } from "@/lib/format";
import { useNowSeconds } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useOptionalWorkspace } from "@/lib/workspace";

/**
 * Relative date ("in 5 days") against the workspace clock, absolute on hover (05 §16).
 * `asOf` defaults to the workspace clock, then to real now.
 */
export function RelativeDate({
  value,
  asOf,
  withDate = false,
  realTime = false,
  className,
}: {
  value: number;
  asOf?: number | null;
  /** Record timestamps (created, decided) are real time, not the workspace's simulated clock (F7). */
  realTime?: boolean;
  /** Append the short absolute date: "in 5 days (22 Oct)". */
  withDate?: boolean;
  className?: string;
}) {
  const ws = useOptionalWorkspace();
  const now = useNowSeconds();
  const base = realTime ? now : (asOf ?? ws?.asOf ?? now);
  const absolute = formatAbsolute(value);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={toDate(value).toISOString()}
          tabIndex={0}
          className={cn("tabular rounded-sm underline decoration-dotted decoration-border-strong underline-offset-4", className)}
        >
          {formatRelative(value, base)}
          {withDate && <span className="text-text-muted"> ({formatShortDay(value)})</span>}
          <span className="sr-only">, {absolute}</span>
        </time>
      </TooltipTrigger>
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
}
