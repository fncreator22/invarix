"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatUtcDay, toUtcDateInput } from "@/lib/format";
import type { ClockMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ClockPreset {
  label: string;
  /** Epoch seconds. */
  asOf: number;
}

const chipClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 text-caption font-medium whitespace-nowrap text-text-secondary";

/**
 * 05 §8 ClockControl: "Simulated · 17 Oct 2026". Admins on a simulated clock get a popover with a
 * date input, optional presets, and Apply (which reruns detection).
 */
export function ClockChip({
  mode,
  asOf,
  canEdit,
  presets = [],
  onApply,
  className,
}: {
  mode: ClockMode;
  asOf: number;
  canEdit: boolean;
  presets?: ClockPreset[];
  onApply: (asOf: number) => Promise<unknown> | void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toUtcDateInput(asOf));
  const [busy, setBusy] = useState(false);
  const label = mode === "simulated" ? `Simulated · ${formatUtcDay(asOf)}` : "Live · today";

  if (!canEdit || mode !== "simulated") {
    return (
      <span className={cn(chipClass, className)} title={formatUtcDay(asOf)}>
        <CalendarClock aria-hidden className="size-3.5" />
        {label}
      </span>
    );
  }

  async function apply() {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return;
    setBusy(true);
    try {
      // Midnight UTC of the chosen day, matching seeded as-of dates.
      await onApply(Math.floor(Date.UTC(y, m - 1, d) / 1000));
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(toUtcDateInput(asOf));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(chipClass, "hover:border-border-strong hover:text-text-primary", className)}
          aria-label={`Workspace clock: ${label}. Change date`}
        >
          <CalendarClock aria-hidden className="size-3.5 text-brand" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void apply();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="clock-date">Simulated date</Label>
            <Input id="clock-date" type="date" value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setValue(toUtcDateInput(p.asOf))}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}
          <p className="text-body-sm text-text-muted">Applying a new date reruns detection for this workspace.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={busy}>
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
