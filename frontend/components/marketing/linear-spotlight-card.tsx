"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LinearSpotlightCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  glowRadius?: number;
}

/**
 * Linear-grade mouse-following spotlight card.
 * Injects `--mouse-x` and `--mouse-y` on pointermove to render an illuminated
 * radial light wash and hairline border highlight without React re-render overhead.
 * Adapted from `reference-library/linear-product-landing-dark/reuse-notes.md`.
 */
export function LinearSpotlightCard({
  children,
  className,
  glowColor = "rgba(94, 106, 210, 0.16)",
  glowRadius = 450,
}: LinearSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    // Touch device guard to conserve battery
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };

    card.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      card.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-6 transition-colors duration-300 hover:border-white/[0.18]",
        className
      )}
      style={
        {
          "--mouse-x": "-9999px",
          "--mouse-y": "-9999px",
        } as React.CSSProperties
      }
    >
      {/* Background Radial Light Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(${glowRadius}px circle at var(--mouse-x) var(--mouse-y), ${glowColor}, transparent 80%)`,
        }}
      />

      {/* Hairline Border Illumination Mask */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(220px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.35), transparent 70%)`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
