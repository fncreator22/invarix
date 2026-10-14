"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DollarSign, Play, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

interface ExecutiveHookBannerProps {
  onSimulateOutage?: () => void;
  onOpenGuide?: () => void;
  onOpenCiGate?: () => void;
}

export function ExecutiveHookBanner({
  onSimulateOutage,
  onOpenCiGate,
}: ExecutiveHookBannerProps) {
  const { slug, workspace } = useWorkspace();
  const router = useRouter();
  const [minimized, setMinimized] = useState(false);
  const isSample = workspace?.data_mode === "sample";

  const handleSimulate = () => {
    if (onSimulateOutage) {
      onSimulateOutage();
    } else {
      router.push(`/w/${slug}/graph?focus=svc_payments_gateway&horizon=30&sim=1`);
    }
  };

  if (minimized) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1.5 text-caption text-text-secondary">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-brand">Risk Intercept</span>
          <span className="hidden sm:inline text-text-muted">·</span>
          <span className="hidden sm:inline">Active waivers monitored across dependency topology</span>
        </div>
        <div className="flex items-center gap-2">
          {isSample && (
            <button
              type="button"
              onClick={handleSimulate}
              className="font-medium text-brand hover:underline flex items-center gap-1"
            >
              <Play className="size-3" /> Simulate 30d horizon
            </button>
          )}
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="text-text-muted hover:text-text-primary text-caption underline"
          >
            Expand banner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-xs transition-all sm:p-5 dark:border-white/[0.08] dark:bg-[#0c0d10]">
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left column: Calm, authoritative engineering copy */}
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.08em] text-text-secondary">
              Pre-Merge Risk Intercept
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
              Living Topology
            </span>
          </div>

          <h2 className="text-h3 font-display font-semibold tracking-tight text-text-primary">
            Dependency Risk Intercept
          </h2>

          <p className="text-body-sm text-text-secondary leading-relaxed">
            Tracks temporary waivers (<code className="rounded border border-border-subtle bg-sunken px-1 font-mono text-caption text-text-primary">#nosec</code>,{" "}
            <code className="rounded border border-border-subtle bg-sunken px-1 font-mono text-caption text-text-primary">@skip</code>, unmanaged feature flags) 
            across living microservice dependencies to stop multi-hop cascading outages before merge.
          </p>
        </div>

        {/* Right column: Business Impact Metrics & Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          {/* Estimated Outage Exposure */}
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3 sm:w-64 space-y-1.5 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between text-caption font-medium text-text-muted">
              <span className="flex items-center gap-1">
                <DollarSign className="size-3.5 text-danger" />
                Est. Outage Exposure
              </span>
              <span className="rounded bg-danger/10 px-1.5 py-0.2 font-mono text-danger text-[11px] font-semibold border border-danger/20">HIGH BLAST</span>
            </div>
            <div className="text-body-base font-bold text-text-primary flex items-baseline justify-between">
              <span>~$340,000 / hr</span>
              <span className="text-caption font-normal text-text-secondary">4 services reachable</span>
            </div>
            <div className="text-[11px] text-text-muted">
              Multi-hop cascading path active
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isSample && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSimulate}
                className="gap-1.5 font-medium flex-1 sm:flex-initial"
              >
                <Play className="size-3.5 fill-current" />
                Simulate 30d horizon
              </Button>
            )}

            {onOpenCiGate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenCiGate}
                className="gap-1.5 flex-1 sm:flex-initial"
              >
                <ShieldAlert className="size-3.5 text-brand" />
                PR CI Gate
              </Button>
            )}

            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="Minimize banner"
              className="rounded p-1 text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors ml-auto sm:ml-0"
              title="Minimize banner"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
