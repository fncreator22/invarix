"use client";

import { useMemo, useState } from "react";
import { Calendar, Layers, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollisionItem {
  id: string;
  name: string;
  service: string;
  expiryDay: number;
  severity: "critical" | "high" | "moderate";
}

const SAMPLE_EXCEPTIONS: CollisionItem[] = [
  { id: "exc_1", name: "TLS 1.1 Waiver", service: "checkout-api", expiryDay: 14, severity: "high" },
  { id: "exc_2", name: "End-to-end Test Skip", service: "payments-core", expiryDay: 21, severity: "critical" },
  { id: "exc_3", name: "Killswitch Bypass", service: "payments-core", expiryDay: 23, severity: "critical" },
  { id: "exc_4", name: "Key Rotation Deferral", service: "auth-gateway", expiryDay: 48, severity: "moderate" },
  { id: "exc_5", name: "Direct DB Connection", service: "reporting-worker", expiryDay: 52, severity: "high" },
];

/**
 * Interactive Date Scrubber Box ("Small Thing Box").
 * Shows how temporal risk collisions occur when multiple waivers expire concurrently.
 * As the user slides the time horizon, colliding waivers pulse and detonate risk alerts.
 */
export function CollisionScrubber({ className }: { className?: string }) {
  const [horizonDays, setHorizonDays] = useState(30);

  const activeCollisions = useMemo(() => {
    return SAMPLE_EXCEPTIONS.filter((e) => e.expiryDay <= horizonDays);
  }, [horizonDays]);

  const hasAvalanche = useMemo(() => {
    // Two high/critical exceptions expiring on payments-core within 5 days of each other
    const coreExceptions = activeCollisions.filter((e) => e.service === "payments-core");
    return coreExceptions.length >= 2;
  }, [activeCollisions]);

  return (
    <div className={cn("rounded-none border border-white/[0.08] bg-[#0c0d0e] p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-brand" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            Temporal Horizon Scrubber
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-none border border-white/[0.1] bg-[#161719] px-2.5 py-0.5 text-xs font-mono text-zinc-200">
          <span>{horizonDays} Days</span>
        </div>
      </div>

      {/* Interactive Range Slider */}
      <div className="mt-4">
        <input
          type="range"
          min={7}
          max={60}
          step={1}
          value={horizonDays}
          onChange={(e) => setHorizonDays(Number(e.target.value))}
          aria-label="Temporal Horizon Scrubber in days"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-brand transition-all"
        />
        <div className="mt-1 flex justify-between text-[12px] font-mono text-zinc-400">
          <span>Today</span>
          <span>30 Days</span>
          <span>60 Days</span>
        </div>
      </div>

      {/* Visual Collision Indicators */}
      <div className="mt-4 space-y-2">
        {SAMPLE_EXCEPTIONS.map((item) => {
          const isExpiring = item.expiryDay <= horizonDays;
          const isCoreCollision = hasAvalanche && item.service === "payments-core" && isExpiring;

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between rounded-none border px-3 py-2 text-xs transition-all duration-300",
                isExpiring
                  ? isCoreCollision
                    ? "border-red-500/40 bg-red-950/20 text-red-200"
                    : "border-white/[0.12] bg-[#141517] text-zinc-200"
                  : "border-white/[0.08] bg-[#0c0d10] text-zinc-400 border-dashed"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-none",
                    item.severity === "critical"
                      ? "bg-red-500"
                      : item.severity === "high"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  )}
                />
                <span className="font-medium">{item.name}</span>
                <span className="font-mono text-[12px] text-zinc-400">({item.service})</span>
              </div>
              <span className="font-mono text-[12px] text-zinc-300">
                {isExpiring ? `T-${item.expiryDay}d` : `Day ${item.expiryDay}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Feedback Banner */}
      <div className="mt-4">
        {hasAvalanche ? (
          <div className="flex items-center gap-2.5 rounded-none border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300">
            <ShieldAlert className="size-4 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold">Avalanche Collision Detected</p>
              <p className="text-[11px] text-red-400/80">
                2 exceptions expire on <code>payments-core</code> in same window. Risk multiplier: <strong>3.4x</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-none border border-white/[0.06] bg-[#121315] p-2.5 text-xs text-zinc-400">
            <Layers className="size-4 shrink-0 text-brand" />
            <span>
              {activeCollisions.length} active waiver{activeCollisions.length === 1 ? "" : "s"} expiring within {horizonDays} days.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
