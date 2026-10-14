"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { middleTruncate } from "@/lib/format";
import { useCopy } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** IDs: mono, middle-truncated, copy on click with tooltip (05 §4.3). */
export function IdText({ id, full = false, className }: { id: string; full?: boolean; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void copy(id);
          }}
          aria-label={`Copy ID ${id}`}
          className={cn(
            "inline-flex min-h-6 items-center rounded-sm px-1 font-mono text-body-sm text-text-secondary transition-colors hover:bg-brand-soft hover:text-text-primary",
            className,
          )}
        >
          {full ? id : middleTruncate(id)}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <span aria-live="polite">{copied ? "Copied" : <>Copy <span className="font-mono">{id}</span></>}</span>
      </TooltipContent>
    </Tooltip>
  );
}
