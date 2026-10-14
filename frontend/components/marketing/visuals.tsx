"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * Small illustrative visuals for the landing page. Native SVG animation (SMIL), rendered static under
 * reduced motion. Colors come from tokens via CSS variables.
 */

const box = "h-24 w-full max-w-[200px]";

function Capture({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 200 96" className={box} aria-hidden>
      <rect x="24" y="10" width="152" height="76" rx="10" fill="var(--bg-raised)" stroke="var(--border-subtle)" />
      <rect x="38" y="24" width="84" height="8" rx="4" fill="var(--text-secondary)" opacity=".7" />
      <rect x="38" y="38" width="56" height="6" rx="3" fill="var(--text-muted)" opacity=".5" />
      <circle cx="152" cy="30" r="9" fill="var(--node-person)" />
      <rect x="38" y="62" width="124" height="6" rx="3" fill="var(--bg-sunken)" />
      <rect x="38" y="62" width={still ? 96 : 0} height="6" rx="3" fill="var(--sev-moderate)">
        {!still && <animate attributeName="width" values="0;96;96" keyTimes="0;.7;1" dur="3s" repeatCount="indefinite" />}
      </rect>
      <text x="38" y="56" fontSize="8" fill="var(--text-muted)">expires in 5 days</text>
    </svg>
  );
}

const CN = [
  [40, 48],
  [92, 24],
  [100, 72],
  [150, 40],
  [168, 78],
] as const;
const CE: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [3, 4],
];

function Connect({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 200 96" className={box} aria-hidden>
      {CE.map(([a, b], i) => (
        <line key={i} x1={CN[a][0]} y1={CN[a][1]} x2={CN[b][0]} y2={CN[b][1]} stroke="var(--border-strong)" strokeWidth="1.5" pathLength={1} strokeDasharray="1" strokeDashoffset={still ? 0 : 1}>
          {!still && <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;.5;1" dur="3s" begin={`${i * 0.25}s`} repeatCount="indefinite" />}
        </line>
      ))}
      {CN.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 3 ? 9 : 6} fill={i === 3 ? "var(--node-service)" : i === 4 ? "var(--sev-high)" : "var(--node-team)"} />
      ))}
    </svg>
  );
}

function Detect({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 200 96" className={box} aria-hidden>
      <circle cx="100" cy="48" r="40" fill="none" stroke="var(--border-subtle)" />
      <circle cx="100" cy="48" r="24" fill="none" stroke="var(--border-subtle)" />
      <g>
        <path d="M100 48 L140 48 A40 40 0 0 0 128 20 Z" fill="var(--brand)" opacity=".22" />
        {!still && <animateTransform attributeName="transform" type="rotate" from="0 100 48" to="-360 100 48" dur="3s" repeatCount="indefinite" />}
      </g>
      <circle cx="122" cy="30" r="5" fill="var(--sev-critical)">
        {!still && <animate attributeName="opacity" values=".25;1;.25" dur="3s" repeatCount="indefinite" />}
      </circle>
      <circle cx="80" cy="64" r="4" fill="var(--sev-low)" />
      <circle cx="74" cy="34" r="4" fill="var(--sev-low)" />
    </svg>
  );
}

const PATH = "M30 70 L78 38 L128 58 L172 26";

function Prove({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 200 96" className={box} aria-hidden>
      <path d={PATH} fill="none" stroke="var(--proof)" strokeWidth="6" opacity=".15" strokeLinecap="round" strokeLinejoin="round" />
      <path d={PATH} fill="none" stroke="var(--proof)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {[
        [30, 70, "var(--node-customer-path)"],
        [78, 38, "var(--node-service)"],
        [128, 58, "var(--node-service)"],
        [172, 26, "var(--sev-high)"],
      ].map(([x, y, c], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill={c as string} stroke="var(--bg-surface)" strokeWidth="2" />
      ))}
      {!still && (
        <circle r="4" fill="var(--proof)">
          <animateMotion path={PATH} dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

const STEPS = [Capture, Connect, Detect, Prove];

export function StepVisual({ step }: { step: number }) {
  const still = usePrefersReducedMotion();
  const V = STEPS[step];
  return (
    <div className="mb-4 flex h-28 w-full items-center justify-center rounded-lg border border-border-subtle bg-sunken/60">
      <V still={still} />
    </div>
  );
}

/** Connector between the four steps; GSAP ScrollTrigger draws it as the section scrolls into view. */
export function StepsLine() {
  const ref = useRef<HTMLSpanElement>(null);
  const still = usePrefersReducedMotion();
  useEffect(() => {
    if (!ref.current || still) return;
    gsap.registerPlugin(ScrollTrigger);
    const t = gsap.fromTo(
      ref.current,
      { scaleX: 0 },
      { scaleX: 1, ease: "none", scrollTrigger: { trigger: ref.current, start: "top 85%", end: "top 35%", scrub: true } },
    );
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, [still]);
  return <span ref={ref} aria-hidden className="absolute top-[9.5rem] right-[12%] left-[12%] hidden h-0.5 origin-left bg-aurora md:block" />;
}

/** Proof-paths card: a chain whose highlight travels hop by hop. */
export function ProofChain() {
  const still = usePrefersReducedMotion();
  const hops = ["Checkout", "checkout-api", "payments-core", "TLS waiver"];
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-body-sm" aria-label="Example proof path">
      {hops.map((h, i) => (
        <li key={h} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-proof" aria-hidden>→</span>}
          <span
            className="rounded-full border border-proof/40 bg-proof-soft px-2.5 py-0.5 motion-safe:animate-[hop_3.2s_ease-in-out_infinite]"
            style={still ? undefined : { animationDelay: `${i * 0.4}s` }}
          >
            {h}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Deterministic-scores card: contributions stack up to the score. */
export function ScoreStack() {
  const parts = [
    { label: "TLS waiver", v: 34, c: "bg-sev-high" },
    { label: "Skipped e2e", v: 26, c: "bg-sev-critical" },
    { label: "Flag override", v: 14, c: "bg-sev-moderate" },
    { label: "Key rotation", v: 8, c: "bg-brand" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-sunken" role="img" aria-label="Score 82 made of four contributions">
        {parts.map((p) => (
          <span key={p.label} className={`${p.c} h-full`} style={{ width: `${p.v}%` }} />
        ))}
      </div>
      <div className="flex items-baseline justify-between font-mono text-caption text-text-muted">
        <span>34 + 26 + 14 + 8</span>
        <span className="text-body font-semibold text-text-primary">= 82</span>
      </div>
    </div>
  );
}
