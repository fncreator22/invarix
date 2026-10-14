import React from "react";

interface ProofStat {
  value: string;
  label: string;
  sublabel: string;
  highlight?: boolean;
}

const STATS: ProofStat[] = [
  {
    value: "14 Tools",
    label: "Read-Only Reasoning",
    sublabel: "8 pre-compiled Cypher rules (0% LLM)",
  },
  {
    value: "<20ms",
    label: "Pre-Merge Gate Latency",
    sublabel: "p95 traversal on service graph",
  },
  {
    value: "100%",
    label: "Grounded Proof Paths",
    sublabel: "Living graph nodes, 0 hallucinated IDs",
  },
  {
    value: "0 Login",
    label: "Developer Sandbox",
    sublabel: "Interactive Northwind Pay telemetry",
    highlight: true,
  },
];

export function ProofStrip() {
  return (
    <section aria-label="Performance and Integrity Guarantees" className="w-full border-y border-white/[0.08] bg-[#0c0d12]/70 py-10">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`space-y-1 ${
                idx < STATS.length - 1 ? "lg:border-r border-white/[0.08] lg:pr-8" : ""
              }`}
            >
              <div className="font-mono text-[2.25rem] sm:text-[2.75rem] font-bold tracking-tight text-white leading-none">
                {stat.value}
              </div>
              <p className="text-[14px] font-medium text-zinc-200 pt-1 leading-snug">{stat.label}</p>
              <p className="font-mono text-[12px] text-zinc-400 leading-normal">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
