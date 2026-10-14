"use client";

import { Hand, Pause, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HeroLink, HeroNode } from "@/components/marketing/hero-graph-canvas"; // types only: the canvas module is client-only
import { usePrefersReducedMotion, useThemeTokens } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// Canvas physics graph (same library as the Graph explorer); client only, loaded as a module so its ref works.
const HeroCanvas = dynamic(() => import("@/components/marketing/hero-graph-canvas"), { ssr: false });

type N = HeroNode;
type L = HeroLink;
const idOf = (v: string | N) => (typeof v === "string" ? v : v.id);

// Illustrative graph modeled on the Northwind Pay sample workspace.
const NODES: N[] = [
  { id: "cp", label: "CustomerPath", name: "Checkout", story: "Shoppers pay through Checkout. It requires checkout-api, so anything checkout-api depends on is on the customer path." },
  { id: "api", label: "Service", name: "checkout-api", story: "checkout-api depends on payments-core. Risk two hops away still lands on customers." },
  { id: "core", label: "Service", name: "payments-core", story: "payments-core carries 4 active exceptions. Each was approved alone; together they make it the riskiest service." },
  { id: "e1", label: "Exception", name: "TLS waiver", severity: 4, story: "Legacy TLS allowed for an acquirer. Its compensating control was last verified 60 days ago." },
  { id: "e2", label: "Exception", name: "Skipped e2e", severity: 5, story: "End-to-end tests skipped for a release. Severity 5, and it expires the same week as two others." },
  { id: "e3", label: "Exception", name: "Flag override", severity: 3, story: "A kill switch forced off during a migration. Renewed three times: temporary is becoming permanent." },
  { id: "e4", label: "Exception", name: "Key rotation", severity: 4, story: "Key rotation deferred. Its owner left in August, so nobody is reviewing it." },
  { id: "team", label: "Team", name: "Payments", story: "The Payments team owns payments-core. Its current lead is who the review should go to." },
  { id: "per", label: "Person", name: "Owner (left)", story: "Recorded owner of the key-rotation waiver. Left the company; Reprieve reroutes the review to the team lead." },
  { id: "ctl", label: "Control", name: "Encrypt in transit", story: "The control the TLS waiver switches off. Reprieve weights exceptions by how important the waived control is." },
  { id: "cc", label: "CompensatingControl", name: "Manual review", story: "Three exceptions rely on the same person's manual review. If they are out, all three mitigations fail at once." },
];
const LINKS: L[] = [
  { source: "cp", target: "api", path: true },
  { source: "api", target: "core", path: true },
  { source: "e1", target: "core", path: true },
  { source: "e2", target: "core", path: true },
  { source: "e3", target: "core", path: true },
  { source: "e4", target: "core", path: true },
  { source: "team", target: "core" },
  { source: "per", target: "e4" },
  { source: "e1", target: "ctl" },
  { source: "team", target: "api" },
  { source: "e2", target: "cc" },
  { source: "e3", target: "cc" },
];

/**
 * Landing hero graph (05 §12.3): drag any node (it springs back), hover to light up its neighbours,
 * click to read its part of the story. Particles trace the proof path; reduced motion keeps it static.
 */
export function HeroGraph({ className }: { className?: string }) {
  const tokens = useThemeTokens();
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("core");
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 520, h: 380 });
  const data = useMemo(() => ({ nodes: NODES.map((n) => ({ ...n })), links: LINKS.map((l) => ({ ...l })) }), []);

  const neighbours = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const l of LINKS) {
      (m[idOf(l.source)] ??= new Set()).add(idOf(l.target));
      (m[idOf(l.target)] ??= new Set()).add(idOf(l.source));
    }
    return m;
  }, []);
  const focus = hover ?? null;
  const lit = (id: string) => !focus || id === focus || neighbours[focus]?.has(id);
  const still = paused || reduced;

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const story = NODES.find((n) => n.id === selected)!;

  return (
    <figure className={cn("relative", className)}>
      <div aria-hidden className="absolute inset-0 -z-10 rounded-[28px] aurora-mesh blur-2xl" />
      <div className="glass rounded-xl border border-border-subtle p-3 shadow-e3 sm:p-5">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="eyebrow text-proof">Live risk graph</p>
          <div className="flex items-center gap-3">
            <p className="hidden items-center gap-1 text-caption text-text-muted sm:flex">
              <Hand className="size-3.5" aria-hidden /> Drag, hover or click a node
            </p>
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
              className="inline-flex min-h-6 items-center gap-1 rounded-sm px-1.5 text-caption text-text-secondary hover:text-text-primary motion-reduce:hidden"
            >
              {paused ? <Play aria-hidden className="size-3" /> : <Pause aria-hidden className="size-3" />}
              {paused ? "Play" : "Pause"}
            </button>
          </div>
        </div>
        <div ref={box} className={cn("h-[340px] touch-pan-y sm:h-[380px]", hover ? "cursor-pointer" : "cursor-grab active:cursor-grabbing")} aria-hidden>
          {tokens && (
            <HeroCanvas
              size={size}
              data={data}
              tokens={tokens}
              lit={lit}
              hover={hover}
              selected={selected}
              still={still}
              onHover={setHover}
              onSelect={setSelected}
            />
          )}
        </div>
        <p className="mt-2 min-h-[3.25rem] rounded-md bg-proof-soft px-3 py-2 text-body-sm text-text-primary" aria-live="polite">
          <span className="font-semibold">{story.name}: </span>
          {story.story}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Pick a node">
          {NODES.filter((n) => n.label === "Service" || n.label === "Exception" || n.id === "per").map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setSelected(n.id)}
              aria-pressed={selected === n.id}
              className={cn(
                "rounded-full border px-2 py-0.5 text-caption",
                selected === n.id ? "border-proof bg-proof-soft text-text-primary" : "border-border-subtle text-text-muted hover:text-text-primary",
              )}
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        Example graph. The Checkout customer path requires the checkout-api service, which depends on payments-core.
        Payments-core carries four active exceptions: a TLS waiver, a skipped end-to-end test, a feature-flag override and a
        delayed key rotation. The key-rotation owner has left, and three mitigations rely on one person. Each exception looks
        reasonable alone; together they put checkout at critical risk.
      </figcaption>
    </figure>
  );
}
