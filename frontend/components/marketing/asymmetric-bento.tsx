"use client";

import { useState } from "react";
import { Layers, CalendarClock, UserX, AlertTriangle, ArrowRight, ShieldCheck, Flame, GitCommit } from "lucide-react";
import { LinearSpotlightCard } from "@/components/marketing/linear-spotlight-card";
import { StatusChip } from "@/components/status-chip";
import { SeverityBadge } from "@/components/severity-badge";
import { ScoreRing } from "@/components/score-ring";
import { cn } from "@/lib/utils";

export function AsymmetricBento() {
  const [activeTab, setActiveTab] = useState<"checkout" | "auth" | "payments">("checkout");

  return (
    <section aria-labelledby="bento-heading" className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24">
      {/* Eyebrow & Headline */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-400">
          Compound Graph Telemetry
        </span>
        <h2 id="bento-heading" className="mt-3 text-display-lg font-bold text-zinc-100">
          Exceptions are approved alone. <br />
          Risk compounds across the graph.
        </h2>
        <p className="mt-3 text-body text-zinc-400">
          Individual waivers look harmless on sprint boards. INVARIX projects them onto your microservice topology to catch cascading failures before peak traffic.
        </p>
      </div>

      {/* Asymmetric 70 / 30 Bento Grid */}
      <div className="mt-12 grid gap-6 lg:grid-cols-12">
        {/* Dominant 8-Column Canvas: Live Compound Service Breakdown */}
        <LinearSpotlightCard className="lg:col-span-8 flex flex-col justify-between p-6 sm:p-8">
          <div>
            {/* Header with pill tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-[#16171a] text-brand">
                  <Layers className="size-5" />
                </span>
                <div>
                  <h3 className="text-h3 font-semibold text-zinc-100">Concentration on payments-core</h3>
                  <p className="text-[12px] text-zinc-400">4 independent squad waivers directly 2 hops from customer checkout</p>
                </div>
              </div>
              <div className="flex rounded-lg border border-white/[0.08] bg-[#121316] p-1">
                {(["checkout", "auth", "payments"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                      activeTab === tab
                        ? "bg-white/[0.1] text-zinc-100 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Live Mesh Topology & Exception Rows */}
            <div className="mt-6 space-y-3">
              {[
                { name: "Legacy TLS 1.0 waiver", squad: "Squad Auth", age: "64 days overdue", sev: "high" as const, decay: "Cascading to checkout" },
                { name: "Skipped load test (Cyber Week)", squad: "Squad Checkout", age: "Expires in 4 days", sev: "critical" as const, decay: "Cascading to checkout" },
                { name: "Payment gateway timeout override", squad: "Squad Settlement", age: "3x renewed", sev: "moderate" as const, decay: "Cascading to checkout" },
                { name: "Service mesh mTLS disable", squad: "Squad Platform", age: "Owner inactive", sev: "high" as const, decay: "Cascading to checkout" },
              ].map((item, idx) => (
                <div
                  key={item.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-[#121317] p-3.5 transition-colors hover:border-white/[0.12]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-md bg-white/[0.05] font-mono text-[11px] text-zinc-400">
                      0{idx + 1}
                    </span>
                    <div>
                      <span className="block text-[13px] font-medium text-zinc-200">{item.name}</span>
                      <span className="block text-[11px] text-zinc-500">{item.squad} · {item.age}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">{item.decay}</span>
                    <SeverityBadge severity={item.sev} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mathematical Grounding Footer */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-[12px]">
            <div className="flex items-center gap-2 text-zinc-400">
              <Flame className="size-4 text-sev-high" />
              <span>Avalanche Risk Score:</span>
              <span className="font-mono font-bold text-zinc-100">82.4 / 100 (Tier-1 Alert)</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">
              Formula: score = Σ base × age × overdue × centrality × multipliers
            </span>
          </div>
        </LinearSpotlightCard>

        {/* 4-Column Telemetry Column: Deterministic Metrics Stack */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Ghost Owner Auto-Reroute */}
          <LinearSpotlightCard className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                <UserX className="size-4" />
              </span>
              <div>
                <h4 className="text-[14px] font-semibold text-zinc-100">Ghost Owner Detection</h4>
                <span className="text-[11px] text-zinc-400">HR Graph Correlation</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-zinc-400 leading-relaxed">
              Priya R. owned 2 security waivers and left the company in August. INVARIX reroutes pending reviews to the active team lead in 14 seconds.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#141518] p-2.5 text-[11px]">
              <span className="text-zinc-400">Reassigned To:</span>
              <span className="font-mono font-medium text-emerald-400">Lead (Alex M.)</span>
            </div>
          </LinearSpotlightCard>

          {/* Card 2: Simultaneous Expiry Collisions */}
          <LinearSpotlightCard className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <CalendarClock className="size-4" />
              </span>
              <div>
                <h4 className="text-[14px] font-semibold text-zinc-100">Collision Windows</h4>
                <span className="text-[11px] text-zinc-400">Sliding Expiry Horizon</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-zinc-400 leading-relaxed">
              3 waivers expire within the exact same 72-hour window during Cyber Week, causing sudden loss of compensating controls.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#141518] p-2.5 text-[11px]">
              <span className="text-zinc-400">Peak Collision:</span>
              <span className="font-mono font-medium text-amber-400">Nov 27 - Nov 30 (84% Risk)</span>
            </div>
          </LinearSpotlightCard>
        </div>
      </div>
    </section>
  );
}
