"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, GitPullRequest, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Meaningful Hero Dependency Graph & Pre-Merge Circuit Breaker Visual.
 * Replaces the decorative orbiting pills with authentic Northwind Pay topology:
 * Customer Checkout Path -> checkout-api -> payments-core -> 4 Active Waivers.
 * Demonstrates how an expired code waiver compound-cascades to checkout and is blocked at PR merge.
 */
export function HeroGraphCircuitBreaker() {
  const [isBlocked, setIsBlocked] = useState(true);

  return (
    <div className="relative w-full max-w-[540px] p-5 sm:p-6 overflow-hidden">
      {/* Ambient Radial Shading - blends smoothly into background blueprint mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_center,_rgba(12,14,22,0.8)_0%,_rgba(8,9,14,0.4)_55%,_transparent_85%)]"
      />

      {/* Shaded Border (Dark to Light falloff, dissolves seamlessly into background) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl p-[1px] [mask-image:radial-gradient(ellipse_at_top,_black_35%,_transparent_75%)]"
      >
        <div className="size-full rounded-2xl bg-gradient-to-b from-white/[0.14] via-brand/[0.08] to-transparent" />
      </div>

      {/* Soft Radial Ambient Spotlight Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-20 rounded-3xl bg-[radial-gradient(ellipse_at_center,_rgba(99,83,232,0.12)_0%,_transparent_70%)] blur-2xl"
      />

      {/* Top Status Bar with Feathered Shaded Divider */}
      <div className="relative flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <GitPullRequest className="size-4 text-brand-solid" aria-hidden="true" />
          <span className="font-mono text-[12px] font-semibold text-zinc-200">PR #482: checkout-api</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBlocked(!isBlocked)}
            className="flex items-center gap-1.5 rounded-none border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <span>State:</span>
            <span className={cn("font-bold", isBlocked ? "text-red-400" : "text-emerald-400")}>
              {isBlocked ? "Waiver Cascade" : "Clean Graph"}
            </span>
          </button>
        </div>
        {/* Soft Divider Line that fades out on both ends */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
        />
      </div>

      {/* Living SVG Microservice Topology */}
      <div className="relative my-6 flex flex-col items-center">
        {/* SVG Connector Lines */}
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          viewBox="0 0 460 220"
          fill="none"
          aria-hidden="true"
        >
          {/* Path from Checkout Path to checkout-api */}
          <path
            d="M 230 35 L 230 75"
            stroke={isBlocked ? "#ef4444" : "#6353E8"}
            strokeWidth="2"
            strokeDasharray={isBlocked ? "4 4" : "none"}
            className={cn(isBlocked && "motion-safe:animate-pulse")}
          />
          {/* Path from checkout-api to payments-core */}
          <path
            d="M 230 115 L 140 160"
            stroke={isBlocked ? "#ef4444" : "rgba(255,255,255,0.15)"}
            strokeWidth="2"
          />
          {/* Path from checkout-api to auth-cache */}
          <path
            d="M 230 115 L 320 160"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
          />
          {/* Path from payments-core to 4 Active Waivers */}
          <path
            d="M 140 185 L 140 210"
            stroke={isBlocked ? "#ef4444" : "rgba(255,255,255,0.15)"}
            strokeWidth="2"
            strokeDasharray="3 3"
          />
        </svg>

        {/* Level 1: Customer Checkout Path (Root Tier-1 Node) */}
        <div className="z-10 flex items-center gap-2 rounded-none border border-white/10 bg-[#14151b] px-3.5 py-1.5 shadow-md">
          <span className="size-2 bg-brand-solid" />
          <span className="font-mono text-[12px] font-medium text-zinc-200">Customer Checkout Path</span>
          <span className="rounded-none bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">P0 Revenue</span>
        </div>

        {/* Level 2: checkout-api (Service Node) */}
        <div className="z-10 mt-6 flex items-center justify-between gap-4 rounded-none border border-white/[0.12] bg-[#161821] px-4 py-2.5 shadow-lg w-full max-w-[320px]">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 bg-brand-solid" />
              <span className="font-mono text-[13px] font-bold text-white">checkout-api</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">2 Hops to Customer Loss</span>
          </div>
          <span
            className={cn(
              "rounded-none px-2 py-0.5 font-mono text-[11px] font-semibold border",
              isBlocked
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}
          >
            {isBlocked ? "Risk: 84.0" : "Risk: 12.0"}
          </span>
        </div>

        {/* Level 3: Upstream Services Split */}
        <div className="z-10 mt-8 flex w-full justify-between gap-4 max-w-[380px]">
          {/* payments-core with compound waivers */}
          <div
            className={cn(
              "flex-1 rounded-none border p-3 transition-colors",
              isBlocked
                ? "border-red-500/40 bg-red-950/20 shadow-md shadow-red-950/20"
                : "border-white/10 bg-[#12141a]"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-bold text-zinc-200">payments-core</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug">Settlement Engine</p>
            {isBlocked && (
              <div className="mt-2 rounded-none border border-red-500/30 bg-red-500/10 px-2 py-1">
                <span className="block font-mono text-[10px] font-bold text-red-300">
                  4 Active Waivers Colliding
                </span>
                <span className="block font-mono text-[9px] text-zinc-400">
                  #nosec · @skip · 12d overdue
                </span>
              </div>
            )}
          </div>

          {/* auth-cache node */}
          <div className="flex-1 rounded-none border border-white/10 bg-[#12141a] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-medium text-zinc-300">auth-cache</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug">Token Boundary</p>
            <span className="mt-2 inline-block rounded-none border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              0 Active Waivers
            </span>
          </div>
        </div>
      </div>

      {/* Pre-Merge CI Circuit Breaker Result Banner */}
      <div
        className={cn(
          "rounded-none border p-3.5 transition-all",
          isBlocked
            ? "border-red-500/40 bg-red-950/30 text-red-200"
            : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isBlocked ? (
              <ShieldAlert className="size-4.5 text-red-400 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-4.5 text-emerald-400 shrink-0" aria-hidden="true" />
            )}
            <div>
              <span className="block font-mono text-[12px] font-bold tracking-tight">
                {isBlocked ? "CI GATE BLOCKED (Exit Code 1)" : "CI GATE PASSED (Exit Code 0)"}
              </span>
              <span className="block text-[11px] text-zinc-300">
                {isBlocked
                  ? "Rule R4 (Concentration) + R8 (Customer Path) fired. Evaluated in 12ms."
                  : "Zero cascading risk detected across microservice graph."}
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded-none bg-black/40 border border-white/10">
            {isBlocked ? "Pre-Merge" : "Verified"}
          </span>
        </div>
      </div>
    </div>
  );
}
