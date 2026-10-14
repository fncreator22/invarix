"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { entityMeta } from "@/components/entity-meta";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { middleTruncate } from "@/lib/format";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 05 §8 CitationChip: proof-colored pill with type icon and mono short ID; click opens the entity drawer. */
export function CitationChip({ citation, className }: { citation: Citation; className?: string }) {
  const { open } = useEntityDrawer();
  const meta = entityMeta(citation.kind, citation.id);
  const Icon = meta.icon;
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => open(citation.id)}
          aria-label={`${meta.label} ${citation.label} (${citation.id}). Open details`}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border border-proof/30 bg-proof-soft px-2 align-middle font-mono text-caption text-proof transition-colors hover:border-proof",
            className,
          )}
        >
          <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
          {middleTruncate(citation.id)}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3">
        <p className="eyebrow text-text-muted">{meta.label}</p>
        <p className="mt-1 font-medium text-text-primary">{citation.label}</p>
        <p className="mt-0.5 font-mono text-caption text-text-muted">{citation.id}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
