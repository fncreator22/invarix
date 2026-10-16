"use client";

import { useState } from "react";
import { GitPullRequest, ShieldAlert, CheckCircle2, Terminal, ArrowRight, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function CircuitBreakerDiff() {
  const [activeTab, setActiveTab] = useState<"diff" | "proof">("diff");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d0e] shadow-2xl">
      {/* Top Console Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.06] bg-[#121316] px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-red-500/80" />
            <span className="size-2.5 rounded-full bg-yellow-500/80" />
            <span className="size-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[12px] font-mono text-zinc-400">
            github.com/acme/checkout · PR #412 (pre-merge evaluation)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-400">
            <Zap className="size-3" />
            Evaluated in 12ms
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-red-400">
            <ShieldAlert className="size-3" />
            Merge Blocked
          </span>
        </div>
      </div>

      {/* Split Comparison Stage */}
      <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
        {/* Left Column: Real Git Diff */}
        <div className="lg:col-span-6 p-4 sm:p-5 font-mono text-[12px] leading-relaxed">
          <div className="flex items-center justify-between pb-3 text-zinc-400 border-b border-white/[0.04]">
            <span className="flex items-center gap-2 text-zinc-300">
              <GitPullRequest className="size-3.5 text-zinc-400" />
              auth_client.go
            </span>
            <span className="text-[11px] text-zinc-500">lines 39-47</span>
          </div>

          <div className="mt-3 space-y-1">
            <div className="text-zinc-500">@@ -39,6 +39,8 @@ func verifySession(token string) bool &#123;</div>
            <div className="text-zinc-400">&nbsp;&nbsp;&nbsp;&nbsp;if token == &quot;&quot; &#123;</div>
            <div className="text-zinc-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return false</div>
            <div className="text-zinc-400">&nbsp;&nbsp;&nbsp;&nbsp;&#125;</div>
            <div className="rounded bg-red-950/40 px-2 py-0.5 text-red-300 border-l-2 border-red-500/80">
              -&nbsp;&nbsp;&nbsp;return authenticator.ValidateWithUpstream(token)
            </div>
            <div className="rounded bg-emerald-950/40 px-2 py-0.5 text-emerald-300 border-l-2 border-emerald-500/80">
              +&nbsp;&nbsp;&nbsp;// #nosec: Temporary sprint waiver for load test bypass
            </div>
            <div className="rounded bg-emerald-950/40 px-2 py-0.5 text-emerald-300 border-l-2 border-emerald-500/80">
              +&nbsp;&nbsp;&nbsp;return true // FIXME: revert after Black Friday
            </div>
            <div className="text-zinc-400">&nbsp;&nbsp;&#125;</div>
          </div>

          <div className="mt-5 rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-[11px]">
            <div className="flex items-center gap-2 font-semibold text-red-300">
              <AlertTriangle className="size-3.5 text-red-400" />
              AST Scanner Caught Inactive Waiver
            </div>
            <p className="mt-1 text-zinc-400">
              Rule <strong>R01_UNMANAGED_BYPASS</strong> detected unmanaged bypass token lacking approval ID or valid expiry metadata.
            </p>
          </div>
        </div>

        {/* Right Column: INVARIX Automated CI Check & Shortest Proof Path */}
        <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col justify-between bg-[#0e0f12]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                  ✕
                </span>
                <span className="text-[13px] font-semibold text-zinc-200">
                  INVARIX Circuit Breaker Bot
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">14 seconds ago</span>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-[13px] text-zinc-300">
                This pull request introduces an unmanaged bypass directly on the customer checkout critical path.
              </p>

              {/* Proof Path Visual Chain */}
              <div className="rounded-lg border border-white/[0.08] bg-[#141519] p-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Shortest Proof Path
                </span>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-200">CustomerPath(Checkout)</span>
                  <ArrowRight className="size-3 text-zinc-500" />
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-200">Service(checkout-api)</span>
                  <ArrowRight className="size-3 text-zinc-500" />
                  <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-300 font-semibold">
                    Service(auth-cache)
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/[0.04]">
                  <span>Cascading Reachability:</span>
                  <span className="font-mono font-semibold text-red-400">P = 0.84 (High Avalanche)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#121316] px-3.5 py-2">
            <span className="text-[12px] text-zinc-400">Action Required:</span>
            <span className="text-[12px] font-mono font-medium text-brand">
              Add `invarix-waiver: exc_xyz` or revert
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
