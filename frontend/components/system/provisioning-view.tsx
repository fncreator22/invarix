"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const PROVISION_STEPS = ["Creating graph", "Loading Northwind Pay", "Running Sentinel", "Ranking risk"] as const;

/** 05 §11 stepped progress: pending circle, active pulsing aurora ring, done check. */
export function ProvisioningStepper({ active, failed = false }: { active: number; failed?: boolean }) {
  return (
    <ol className="space-y-4" aria-label="Provisioning progress">
      {PROVISION_STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active && !failed;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={current ? "step" : undefined}>
            <span className="relative inline-flex size-7 shrink-0 items-center justify-center">
              {done ? (
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-solid text-text-on-brand">
                  <Check aria-hidden className="size-4" />
                </span>
              ) : current ? (
                <>
                  <span aria-hidden className="absolute inset-0 rounded-full bg-aurora opacity-60 motion-safe:animate-pulse-ring" />
                  <span aria-hidden className="relative size-7 rounded-full bg-aurora p-[3px]">
                    <span className="block size-full rounded-full bg-surface" />
                  </span>
                </>
              ) : (
                <Circle aria-hidden className={cn("size-6", failed && i === active ? "text-danger" : "text-border-strong")} />
              )}
            </span>
            <span
              className={cn(
                "text-body",
                done ? "text-text-primary" : current ? "font-medium text-text-primary" : "text-text-muted",
                failed && i === active && "text-danger",
              )}
            >
              {label}
              {current && <span className="sr-only"> (in progress)</span>}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** SCR-X-05: workspace still provisioning. Auto-continues when the parent sees `ready`. */
export function ProvisioningView({ name, step = 1 }: { name: string; step?: number }) {
  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <p className="eyebrow text-brand">Setting up</p>
      <h1 className="mt-2 text-h2 font-semibold">{name} is almost ready</h1>
      <p className="mt-2 text-text-secondary">This usually takes under 30 seconds. The page continues on its own.</p>
      <div className="mt-8 card-e1 p-6">
        <ProvisioningStepper active={step} />
      </div>
    </section>
  );
}
