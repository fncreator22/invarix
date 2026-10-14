"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type OrbSize = 20 | 64;
export type OrbState = "working" | "searching" | "solving" | "listening" | "composing" | "shaping";

export interface ThinkingOrbProps {
  state?: OrbState;
  size?: OrbSize;
  className?: string;
  "aria-label"?: string;
  paused?: boolean;
}

const STATE_CONFIG: Record<
  OrbState,
  {
    label: string;
    speedClass: string;
    pulseClass: string;
    dotOpacity: number[];
    accentColor: string;
  }
> = {
  working: {
    label: "Working…",
    speedClass: "motion-safe:animate-spin [animation-duration:8s]",
    pulseClass: "motion-safe:animate-pulse [animation-duration:3s]",
    dotOpacity: [0.9, 0.6, 0.4, 0.8, 0.5, 0.7],
    accentColor: "rgba(91, 75, 224, 0.9)", // Brand violet
  },
  searching: {
    label: "Searching graph…",
    speedClass: "motion-safe:animate-spin [animation-duration:4s]",
    pulseClass: "motion-safe:animate-pulse [animation-duration:2s]",
    dotOpacity: [0.95, 0.7, 0.5, 0.85, 0.6, 0.75],
    accentColor: "rgba(34, 211, 238, 0.9)", // Cyan
  },
  solving: {
    label: "Calculating proof paths…",
    speedClass: "motion-safe:animate-spin [animation-duration:3s]",
    pulseClass: "motion-safe:animate-pulse [animation-duration:1.5s]",
    dotOpacity: [1, 0.8, 0.6, 0.9, 0.7, 0.8],
    accentColor: "rgba(245, 158, 11, 0.95)", // Amber
  },
  listening: {
    label: "Awaiting human review…",
    speedClass: "motion-safe:animate-spin [animation-duration:12s]",
    pulseClass: "motion-safe:animate-pulse [animation-duration:4s]",
    dotOpacity: [0.6, 0.4, 0.3, 0.5, 0.4, 0.5],
    accentColor: "rgba(161, 161, 170, 0.8)", // Neutral zinc
  },
  composing: {
    label: "Composing answer…",
    speedClass: "motion-safe:animate-spin [animation-duration:5s]",
    pulseClass: "motion-safe:animate-pulse [animation-duration:2.5s]",
    dotOpacity: [0.9, 0.7, 0.5, 0.8, 0.6, 0.7],
    accentColor: "rgba(129, 140, 248, 0.9)", // Indigo
  },
  shaping: {
    label: "Drafting proposed action…",
    speedClass: "motion-safe:animate-spin [animation-duration:6s]",
    pulseClass: "motion-safe:animate-pulse [animation-duration:2.8s]",
    dotOpacity: [0.85, 0.65, 0.45, 0.75, 0.55, 0.65],
    accentColor: "rgba(52, 211, 153, 0.9)", // Emerald
  },
};

/**
 * Accessible Thinking Orb component adhering to the `thinking-orbs` design contract.
 * Renders tuned particle dots on transparent SVG with 6 semantic indeterminate states.
 * Respects `prefers-reduced-motion` and supports `size={20}` (micro) or `size={64}` (macro).
 */
export function ThinkingOrb({
  state = "working",
  size = 20,
  className,
  "aria-label": ariaLabel,
  paused = false,
}: ThinkingOrbProps) {
  const maskId = useId();
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.working;
  const label = ariaLabel ?? cfg.label;

  if (size === 20) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "relative inline-flex size-5 shrink-0 items-center justify-center select-none",
          className
        )}
      >
        <svg
          viewBox="0 0 20 20"
          className={cn(
            "size-full",
            !paused && cfg.speedClass,
            "motion-reduce:animate-none"
          )}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer constellation dots */}
          <circle cx="10" cy="2.5" r="1.3" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[0]} />
          <circle cx="16.5" cy="6.2" r="1.1" fill="currentColor" fillOpacity={cfg.dotOpacity[1]} />
          <circle cx="16.5" cy="13.8" r="1.2" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[2]} />
          <circle cx="10" cy="17.5" r="1.4" fill="currentColor" fillOpacity={cfg.dotOpacity[3]} />
          <circle cx="3.5" cy="13.8" r="1.1" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[4]} />
          <circle cx="3.5" cy="6.2" r="1.2" fill="currentColor" fillOpacity={cfg.dotOpacity[5]} />

          {/* Inner core pulse */}
          <circle
            cx="10"
            cy="10"
            r="2.2"
            fill={cfg.accentColor}
            className={cn(!paused && cfg.pulseClass, "motion-reduce:animate-none")}
          />
        </svg>
      </span>
    );
  }

  // Macro scale (size={64}) for empty states, chat avatars, and focus points
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center select-none",
        className
      )}
    >
      {/* Ambient backdrop glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-xl transition-all",
          !paused && cfg.pulseClass,
          "motion-reduce:animate-none"
        )}
        style={{ backgroundColor: cfg.accentColor, opacity: 0.2 }}
      />

      <svg
        viewBox="0 0 64 64"
        className={cn(
          "relative size-full",
          !paused && cfg.speedClass,
          "motion-reduce:animate-none"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`glow-${maskId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={cfg.accentColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={cfg.accentColor} stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Outer Orbit Path */}
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <circle
          cx="32"
          cy="32"
          r="21"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {/* Outer ring particles */}
        <circle cx="32" cy="4" r="2.8" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[0]} />
        <circle cx="51.8" cy="12.2" r="2.2" fill="currentColor" fillOpacity={cfg.dotOpacity[1]} />
        <circle cx="60" cy="32" r="2.6" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[2]} />
        <circle cx="51.8" cy="51.8" r="2.4" fill="currentColor" fillOpacity={cfg.dotOpacity[3]} />
        <circle cx="32" cy="60" r="2.8" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[4]} />
        <circle cx="12.2" cy="51.8" r="2.2" fill="currentColor" fillOpacity={cfg.dotOpacity[5]} />
        <circle cx="4" cy="32" r="2.5" fill={cfg.accentColor} fillOpacity={cfg.dotOpacity[0]} />
        <circle cx="12.2" cy="12.2" r="2.3" fill="currentColor" fillOpacity={cfg.dotOpacity[1]} />

        {/* Inner ring particles */}
        <circle cx="32" cy="11" r="1.8" fill="currentColor" fillOpacity="0.6" />
        <circle cx="47" cy="17" r="1.6" fill={cfg.accentColor} fillOpacity="0.8" />
        <circle cx="53" cy="32" r="2.0" fill="currentColor" fillOpacity="0.5" />
        <circle cx="47" cy="47" r="1.8" fill={cfg.accentColor} fillOpacity="0.7" />
        <circle cx="32" cy="53" r="1.6" fill="currentColor" fillOpacity="0.6" />
        <circle cx="17" cy="47" r="2.0" fill={cfg.accentColor} fillOpacity="0.8" />
        <circle cx="11" cy="32" r="1.7" fill="currentColor" fillOpacity="0.5" />
        <circle cx="17" cy="17" r="1.9" fill={cfg.accentColor} fillOpacity="0.7" />

        {/* Central Core Sphere */}
        <circle
          cx="32"
          cy="32"
          r="8"
          fill={`url(#glow-${maskId})`}
          className={cn(!paused && cfg.pulseClass, "motion-reduce:animate-none")}
        />
        <circle cx="32" cy="32" r="4.5" fill={cfg.accentColor} />
      </svg>
    </div>
  );
}
