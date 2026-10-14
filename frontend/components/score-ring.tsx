"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SEVERITY_META } from "@/components/severity-badge";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { bandFor, type Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 32, stroke: 3.5, num: "text-[11px] font-semibold", label: "" },
  md: { px: 72, stroke: 6, num: "text-[22px] font-bold font-display", label: "text-[10px]" },
  lg: { px: 160, stroke: 10, num: "text-metric font-bold font-display", label: "text-caption" },
} as const;

const BAND_STROKE: Record<Severity, string> = {
  low: "var(--sev-low)",
  moderate: "var(--sev-moderate)",
  high: "var(--sev-high)",
  critical: "var(--sev-critical)",
};

/** Count from the previous value to the next over `duration` ms (skipped under reduced motion). */
function useCountUp(target: number, duration: number, reduced: boolean) {
  const [value, setValue] = useState(reduced ? target : 0);
  const from = useRef(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      from.current = target;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- snap to the target without animation
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(origin + (target - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value;
}

/**
 * 05 §8 ScoreRing: 0–100 arc in the band color with an aurora highlight on the leading edge.
 * Animates on first view and only the delta afterwards. The band label is always present.
 */
export function ScoreRing({
  score,
  band,
  size = "md",
  className,
}: {
  score: number;
  band?: Severity;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const clamped = Math.max(0, Math.min(100, score));
  const resolvedBand = band ?? bandFor(clamped);
  const shown = useCountUp(clamped, 700, reduced);
  const { px, stroke, num, label } = SIZES[size];
  const r = (px - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gradId = useId();
  const angle = (shown / 100) * 2 * Math.PI - Math.PI / 2;
  const tipX = px / 2 + r * Math.cos(angle);
  const tipY = px / 2 + r * Math.sin(angle);
  const bandLabel = SEVERITY_META[resolvedBand].label;

  return (
    <div
      role="img"
      aria-label={`Risk score ${Math.round(clamped)} of 100, ${bandLabel}`}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <div className="relative shrink-0" style={{ width: px, height: px }}>
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden>
          <defs>
            <radialGradient id={gradId}>
              <stop offset="0%" stopColor="var(--aurora-end)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--aurora-start)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={stroke} />
          <circle
            cx={px / 2}
            cy={px / 2}
            r={r}
            fill="none"
            stroke={BAND_STROKE[resolvedBand]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown / 100)}
            transform={`rotate(-90 ${px / 2} ${px / 2})`}
            style={{ transition: "stroke var(--dur-base) var(--ease-out)" }}
          />
          {shown > 2 && size !== "sm" && <circle cx={tipX} cy={tipY} r={stroke * 1.4} fill={`url(#${gradId})`} />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className={cn("tabular text-text-primary", num)}>{Math.round(shown)}</span>
          {size !== "sm" && (
            <span className={cn("mt-1 font-medium", label, SEVERITY_META[resolvedBand].text)}>{bandLabel}</span>
          )}
        </div>
      </div>
      {size === "sm" && (
        <span className={cn("text-caption font-medium", SEVERITY_META[resolvedBand].text)}>{bandLabel}</span>
      )}
    </div>
  );
}
