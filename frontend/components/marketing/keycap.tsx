"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface KeycapProps {
  keys: string[];
  className?: string;
  onClick?: () => void;
}

/**
 * Linear-grade tactile Keycap badge with hardware top-reflection
 * and click depression feedback.
 * Adapted from `reference-library/linear-product-landing-dark/reuse-notes.md#L105-L128`.
 */
export function Keycap({ keys, className, onClick }: KeycapProps) {
  const [active, setActive] = useState(false);

  const content = keys.map((k, i) => (
    <kbd
      key={i}
      className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-[5px] border border-white/[0.14] bg-[#1a1b1e] px-1.5 text-[11px] font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.4)]"
    >
      {k}
    </kbd>
  ));

  const classes = cn(
    "inline-flex items-center gap-1 font-mono transition-transform duration-100",
    active && "scale-95",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        onMouseLeave={() => setActive(false)}
        className={classes}
      >
        {content}
      </button>
    );
  }

  return <span className={classes}>{content}</span>;
}
