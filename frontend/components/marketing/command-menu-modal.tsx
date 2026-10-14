"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Keycap } from "@/components/marketing/keycap";

interface CommandMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Linear-style Command Palette (`Cmd+K`) simulating Reprieve's Steward Agent.
 * Features instant backdrop blur, keyboard shortcuts, and agent reasoning actions.
 * Adapted from `reference-library/linear-product-landing-dark/analysis/sections/07-command-menu-shortcuts.md`.
 */
export function CommandMenuModal({ open, onOpenChange }: CommandMenuModalProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32">
      {/* Backdrop Blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-150 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.12] bg-[#121316] shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center border-b border-white/[0.08] px-4 py-3">
          <Bot className="mr-2.5 size-5 text-brand" />
          <input
            autoFocus
            placeholder="Ask Steward or jump to exception..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <Keycap keys={["ESC"]} onClick={() => onOpenChange(false)} />
        </div>

        {/* Action Items List */}
        <div className="max-h-80 overflow-y-auto p-2 text-xs">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
            Suggested Agent Actions
          </div>

          <div
            onClick={() => setSelectedAction("reassigned")}
            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="size-4 text-emerald-400" />
              <span>Reroute orphaned exception to current team lead</span>
            </div>
            <Keycap keys={["R"]} />
          </div>

          <div
            onClick={() => setSelectedAction("avalanche")}
            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-amber-400" />
              <span>Calculate avalanche centrality for payments-core</span>
            </div>
            <Keycap keys={["P"]} />
          </div>

          <div
            onClick={() => setSelectedAction("precedent")}
            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-brand" />
              <span>Recall precedent: how was TLS waiver resolved previously?</span>
            </div>
            <Keycap keys={["H"]} />
          </div>
        </div>

        {/* Selected Result Preview */}
        {selectedAction && (
          <div className="border-t border-white/[0.08] bg-[#0c0d0f] p-4 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-zinc-200">Steward Agent Response:</span>
              <span className="rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                Grounded Proof Path #402
              </span>
            </div>
            <p className="mt-2 text-zinc-300">
              {selectedAction === "reassigned" &&
                "ProposedAction: Reassigned exception 'Key rotation deferral' from inactive owner to Payments Team Lead (sarah@northwind.io)."}
              {selectedAction === "avalanche" &&
                "Centrality Score: 0.84. 4 active waivers affect payments-core. Shortest blast path reaches Checkout in 2 hops."}
              {selectedAction === "precedent" &&
                "Recalled Precedent #18: Similar TLS waiver was mitigated with Cloudflare mTLS proxy in Q3. Recommending playbook action."}
            </p>
          </div>
        )}

        {/* Dialog Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0c0d0f] px-4 py-2.5 text-[11px] text-zinc-500">
          <span>Steward multi-hop graph reasoning</span>
          <div className="flex items-center gap-2">
            <span>Use</span>
            <Keycap keys={["↑", "↓"]} />
            <span>to navigate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
