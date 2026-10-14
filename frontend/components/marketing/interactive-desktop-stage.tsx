"use client";

import { useState } from "react";
import { Terminal, Shield, Network, Zap, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { HeroGraph } from "@/components/marketing/hero-graph";
import { Button } from "@/components/ui/button";
import { REPRIEVE_VIDEOS } from "@/lib/videos";
import { cn } from "@/lib/utils";

export function InteractiveDesktopStage() {
  const [mode, setMode] = useState<"graph" | "telemetry" | "film">("graph");
  const video = REPRIEVE_VIDEOS.HERO_SHOWCASE;

  return (
    <div className="relative mx-auto w-full max-w-[1240px]">
      {/* Ambient Volumetric Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 sm:-inset-8 -z-10 rounded-[32px] bg-gradient-to-b from-brand/20 via-brand/5 to-transparent blur-3xl"
      />

      {/* Main Illuminated Operating Window */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#090a0d] shadow-2xl ring-1 ring-white/10">
        {/* Top Window Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] bg-[#101116] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-3 rounded-full bg-red-500/80 shadow-sm" />
              <span className="size-3 rounded-full bg-yellow-500/80 shadow-sm" />
              <span className="size-3 rounded-full bg-green-500/80 shadow-sm" />
            </div>
            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
            <span className="text-[12px] font-mono text-zinc-300 font-medium">
              Reprieve Mission Control · payments-mesh.falkordb
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg border border-white/[0.08] bg-[#16171d] p-1">
            <button
              type="button"
              onClick={() => setMode("graph")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                mode === "graph"
                  ? "bg-white/[0.12] text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Network className="size-3.5 text-brand" />
              <span>Interactive Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("telemetry")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                mode === "telemetry"
                  ? "bg-white/[0.12] text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Zap className="size-3.5 text-amber-400" />
              <span>Avalanche Telemetry</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("film")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                mode === "film"
                  ? "bg-white/[0.12] text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Play className="size-3.5 text-emerald-400" />
              <span>Live System Film</span>
            </button>
          </div>
        </div>

        {/* Dynamic Window Body */}
        <div className="relative min-h-[460px] p-2 sm:p-4">
          {mode === "graph" && (
            <div className="size-full">
              <HeroGraph />
            </div>
          )}

          {mode === "telemetry" && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#121318] p-4">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">Downstream Nodes at Risk</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-zinc-100">4 Microservices</div>
                  <span className="mt-1 block text-[11px] text-zinc-500">checkout-api, payments-core, auth-cache, acquirer-gw</span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#121318] p-4">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">Compound Risk Score</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-red-400">82.4 / 100</div>
                  <span className="mt-1 block text-[11px] text-zinc-500">Ranked #1 highest critical severity</span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#121318] p-4">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">Next Scheduled Review</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">Today, 4:00 PM</div>
                  <span className="mt-1 block text-[11px] text-zinc-500">Auto-routed to active squad lead</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#121318] p-5">
                <h4 className="text-[14px] font-semibold text-zinc-200">Active Mathematical Avalanche Equation</h4>
                <div className="mt-3 rounded-lg bg-[#0c0d10] p-4 font-mono text-[13px] text-zinc-300">
                  P(collapse) = p₀^h · ∏ (1 + overdue_factor) · max(centrality_score)
                </div>
                <p className="mt-3 text-[12px] text-zinc-400">
                  Deterministic proof path computed directly over FalkorDB directed edges. No AI guessing.
                </p>
              </div>
            </div>
          )}

          {mode === "film" && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-cover"
                src={video.path}
              />
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-white/[0.06] bg-[#0c0d10] px-4 py-2.5 text-[11px] font-mono text-zinc-400 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              Graph Engine Synced
            </span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline">Three-graph FalkorDB: org_northwind, mem_steward</span>
          </div>
          <span className="text-zinc-500">Zero credentials required · AST & Metadata only</span>
        </div>
      </div>
    </div>
  );
}
