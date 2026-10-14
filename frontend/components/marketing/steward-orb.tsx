"use client";

import { useState, useRef, useCallback } from "react";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

/**
 * Ambient AI Orb component.
 * Represents the Steward neural mesh and living graph brain.
 * Features organic radial plasma layers, orbiting satellite nodes,
 * hardware-accelerated 3D parallax tilt, and reduced-motion safety.
 */
export function StewardOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    // Subtle physical tilt (clamped to +/- 8 degrees)
    setTilt({ x: -(y * 16), y: x * 16 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: isHovered ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="relative mx-auto flex items-center justify-center size-[300px] sm:size-[360px] md:size-[420px] select-none cursor-pointer group"
    >
      {/* Outer Atmospheric Haze */}
      <div
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(91,75,224,0.35)_0%,rgba(34,211,238,0.18)_45%,transparent_70%)] blur-[50px] motion-safe:animate-pulse motion-reduce:animate-none"
        style={{ animationDuration: "6s" }}
      />

      {/* Outer Orbit Ring with Rotating Satellite Node */}
      <div
        className="absolute inset-4 rounded-full border border-white/[0.08] motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "28s" }}
      >
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-brand/50 bg-[#0d0e14]/90 px-2.5 py-0.5 text-[10px] font-mono text-brand shadow-lg shadow-brand/30">
          <span className="size-1.5 rounded-full bg-brand animate-ping motion-reduce:animate-none" />
          <span>Sentinel Guard</span>
        </div>
      </div>

      {/* Middle Counter-Rotating Celestial Ring */}
      <div
        className="absolute inset-14 rounded-full border border-dashed border-cyan-500/20 motion-safe:animate-spin motion-reduce:animate-none"
        style={{ animationDuration: "20s", animationDirection: "reverse" }}
      >
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 size-3 rounded-full border border-cyan-400 bg-cyan-950 shadow-md shadow-cyan-400/50" />
      </div>

      {/* Core Plasma Sphere */}
      <div className="relative size-44 sm:size-52 rounded-full p-[2px] bg-gradient-to-tr from-brand via-cyan-400 to-indigo-600 shadow-[0_0_80px_rgba(91,75,224,0.6)] transition-transform duration-500 group-hover:scale-[1.03]">
        <div className="relative flex flex-col items-center justify-center size-full rounded-full bg-[#07080c] overflow-hidden backdrop-blur-xl">
          {/* Inner Caustics and Plasma Swirl */}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(139,125,255,0.45)_0%,rgba(34,211,238,0.25)_40%,transparent_75%)] motion-safe:animate-pulse motion-reduce:animate-none"
            style={{ animationDuration: "3.5s" }}
          />
          <div
            className="absolute -inset-2 bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(255,255,255,0.2)_360deg)] motion-safe:animate-spin motion-reduce:animate-none"
            style={{ animationDuration: "8s" }}
          />

          {/* Steward Core Identity */}
          <div className="relative z-10 flex flex-col items-center text-center p-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-inner backdrop-blur-md">
              <Cpu className="size-6 text-cyan-300 motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
            <span className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em] text-cyan-200 font-semibold">
              Steward Mesh
            </span>
            <span className="mt-0.5 text-[9.5px] font-mono text-zinc-400">
              14 Tools · FalkorDB
            </span>
          </div>
        </div>
      </div>

      {/* Floating Status Badges */}
      <div className="absolute bottom-2 sm:bottom-4 left-4 sm:left-6 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 font-mono text-[10px] text-emerald-300 backdrop-blur-md shadow-lg transition-transform duration-300 group-hover:translate-x-1">
        <Activity className="size-3 text-emerald-400" />
        <span>12ms Pre-Merge Gate</span>
      </div>

      <div className="absolute top-4 sm:top-6 right-2 sm:right-6 flex items-center gap-1.5 rounded-full border border-brand/30 bg-indigo-950/60 px-3 py-1 font-mono text-[10px] text-indigo-200 backdrop-blur-md shadow-lg transition-transform duration-300 group-hover:-translate-x-1">
        <ShieldCheck className="size-3 text-brand" />
        <span>Grounded Proof Paths</span>
      </div>
    </div>
  );
}
