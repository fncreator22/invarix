"use client";

import { useEffect, useState } from "react";

/**
 * Living Technical Blueprint & Ambient Mesh Background
 * Features:
 * 1. Persistent 32px precision square blueprint grid + dot-matrix intersections
 * 2. Mouse-following ambient illumination spotlight (hairline grid glow)
 * 3. Slow volumetric aurora drift orbs creating continuous depth across sections
 * Hardware-accelerated, zero React re-render overhead on mousemove, respects reduced-motion.
 */
export function AmbientBackground() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      document.documentElement.style.setProperty("--bg-mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--bg-mouse-y", `${e.clientY}px`);
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#07080a]">
      {/* Precision Blueprint Grid (Square Mesh 32px with gentle scroll-parallax) */}
      <div
        className="absolute inset-0 transition-transform duration-75 ease-out"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          transform: `translateY(${(-scrollY * 0.15) % 32}px)`,
        }}
      />

      {/* High-Contrast Micro Dot-Matrix Crossings (64px Grid) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.35) 1.5px, transparent 1.5px)",
          backgroundSize: "64px 64px",
          transform: `translateY(${(-scrollY * 0.3) % 64}px)`,
        }}
      />

      {/* Mouse-Following Radial Blueprint Spotlight (Reveals ambient grid on hover) */}
      <div
        className="absolute inset-0 transition-opacity duration-300 opacity-90 sm:opacity-100"
        style={{
          background: `radial-gradient(750px circle at var(--bg-mouse-x, 50vw) var(--bg-mouse-y, 30vh), rgba(91, 75, 224, 0.28), transparent 75%)`,
        }}
      />

      {/* Secondary Cyan Graph Circuit Glow */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(500px circle at var(--bg-mouse-x, 50vw) var(--bg-mouse-y, 30vh), rgba(34, 211, 238, 0.12), transparent 70%)`,
        }}
      />

      {/* Volumetric Aurora Drift Orbs (Slow Atmospheric Depth) */}
      <div className="absolute top-[-10%] left-[20%] h-[700px] w-[900px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.14)_0%,_rgba(7,8,10,0)_70%)] blur-[120px] motion-safe:animate-[aurora-drift_16s_ease-in-out_infinite_alternate]" />
      <div className="absolute top-[35%] right-[-10%] h-[600px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.06)_0%,_rgba(7,8,10,0)_70%)] blur-[140px] motion-safe:animate-[drift_12s_ease-in-out_infinite_alternate]" />
      <div className="absolute top-[70%] left-[-15%] h-[650px] w-[850px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.08)_0%,_rgba(7,8,10,0)_70%)] blur-[140px] motion-safe:animate-[aurora-drift_20s_ease-in-out_infinite_alternate]" />

      {/* Bottom Vignette to ground footer */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#07080a] to-transparent" />
    </div>
  );
}
