"use client";

import Link from "next/link";
import { ArrowRight, Download, Network } from "lucide-react";
import { toast } from "sonner";
import { entityMeta } from "@/components/entity-meta";
import { NodeShape } from "@/components/node-shape";
import { humanizeEdge } from "@/lib/format";
import type { ProofEdge, ProofNode, ProofPath as ProofPathT } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useOptionalWorkspace } from "@/lib/workspace";

const INVERSE: Record<string, string> = {
  AFFECTS: "affected by",
  OWNS: "owned by",
  OWNED_BY: "owns",
  LEADS: "led by",
  WAIVES: "waived by",
  COMPENSATED_BY: "compensates",
  RELIES_ON: "relied on by",
  REQUIRES: "required by",
  DEPENDS_ON: "depended on by",
  RENEWS: "renewed by",
  APPROVED_BY: "approved",
  MEMBER_OF: "has member",
  ABOUT: "subject of",
};

/** Longest-path layering from sources; good enough for the minimal proof subgraphs (≤ ~20 nodes). */
function layout(nodes: ProofNode[], edges: ProofEdge[]) {
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of edges) {
      const d = (depth.get(e.from) ?? 0) + 1;
      if (depth.has(e.to) && d > (depth.get(e.to) ?? 0) && d < nodes.length) {
        depth.set(e.to, d);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const layers: string[][] = [];
  for (const n of nodes) (layers[depth.get(n.id) ?? 0] ??= []).push(n.id);
  const colW = 128;
  const rowH = 76;
  const maxRows = Math.max(1, ...layers.map((l) => l?.length ?? 0));
  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((ids, col) =>
    ids?.forEach((id, row) => {
      const offset = ((maxRows - ids.length) * rowH) / 2;
      pos.set(id, { x: 56 + col * colW, y: 30 + offset + row * rowH });
    }),
  );
  return { pos, width: 112 + (layers.length - 1) * colW, height: 60 + (maxRows - 1) * rowH + 22 };
}

/** Readable chains: "Checkout → requires → checkout-api → affected by → EXC-17". */
export function proofSteps(path: ProofPathT): { names: string[]; rels: string[] }[] {
  const name = (id: string) => path.nodes.find((n) => n.id === id)?.name ?? id;
  const chains: { ids: string[]; rels: string[] }[] = [];
  for (const e of path.edges) {
    const cur = chains[chains.length - 1];
    const end = cur?.ids[cur.ids.length - 1];
    if (cur && e.from === end) {
      cur.ids.push(e.to);
      cur.rels.push(humanizeEdge(e.type));
    } else if (cur && e.to === end) {
      cur.ids.push(e.from);
      cur.rels.push(INVERSE[e.type] ?? `${humanizeEdge(e.type)} (from)`);
    } else {
      chains.push({ ids: [e.from, e.to], rels: [humanizeEdge(e.type)] });
    }
  }
  if (chains.length === 0 && path.nodes.length) chains.push({ ids: [path.nodes[0].id], rels: [] });
  return chains.map((c) => ({ names: c.ids.map(name), rels: c.rels }));
}

/**
 * 05 §8 ProofPath: mini-graph + text step list (always present) + "Show on graph".
 * Edges draw in sequence (90 ms per hop) unless reduced motion is on.
 */
export function ProofPath({
  path,
  graphHref,
  compact = false,
  className,
}: {
  path: ProofPathT;
  /** Defaults to the workspace graph focused on these nodes. */
  graphHref?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const ws = useOptionalWorkspace();
  const { pos, width, height } = layout(path.nodes, path.edges);
  const href =
    graphHref === undefined && ws
      ? `/w/${ws.slug}/graph?path=${encodeURIComponent(path.nodes.map((n) => n.id).join(","))}`
      : graphHref;
  const steps = proofSteps(path);

  const exportEvidence = () => {
    const packet = {
      standard: "INVARIX-Proof-Path-Evidence-v1.0",
      exported_at: new Date().toISOString(),
      summary: path.summary,
      nodes: path.nodes,
      edges: path.edges,
      steps: steps,
      workspace: ws?.slug ?? "sample",
      attestation: "Extracted via Cypher shortest-path query. 100% Grounded against FalkorDB entity graph.",
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invarix-proof-evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit Evidence JSON exported! Ready for review.");
  };

  return (
    <figure className={cn("rounded-lg border border-border-subtle bg-surface", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          <p className="eyebrow text-proof">Proof path</p>
          <figcaption className="mt-1 text-body-sm text-text-primary">{path.summary}</figcaption>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={exportEvidence}
            title="Export Evidence for SOC2 / Audit Binder"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-body-sm font-mono text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
          >
            <Download aria-hidden className="size-3.5 text-proof" />
            <span>Export Evidence</span>
          </button>
          {href && (
            <Link
              href={href}
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-body-sm font-medium text-brand hover:bg-brand-soft"
            >
              <Network aria-hidden className="size-4" />
              Show on graph
            </Link>
          )}
        </div>
      </div>

      {path.nodes.length > 0 && (
        <div className="overflow-x-auto px-2 py-3">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden
            className="mx-auto block max-w-none"
          >
            {path.edges.map((e, i) => {
              const a = pos.get(e.from);
              const b = pos.get(e.to);
              if (!a || !b) return null;
              return (
                <g key={`${e.from}-${e.to}-${i}`}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--proof)" strokeOpacity={0.18} strokeWidth={6} strokeLinecap="round" />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    pathLength={1}
                    stroke="var(--proof)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray="1"
                    className="motion-safe:animate-draw-line"
                    style={{ animationDelay: `calc(var(--dur-path) * ${i})` }}
                  />
                </g>
              );
            })}
            {path.nodes.map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              const meta = entityMeta(n.label, n.id);
              return (
                <g key={n.id}>
                  <NodeShape shape={meta.shape} cx={p.x} cy={p.y} r={11} fill={meta.color} stroke="var(--bg-surface)" strokeWidth={2} />
                  <text
                    x={p.x}
                    y={p.y + 28}
                    textAnchor="middle"
                    className="fill-text-secondary font-sans text-[11px]"
                  >
                    {n.name.length > 18 ? `${n.name.slice(0, 17)}…` : n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {compact ? (
        <details className="group px-4 pb-3 text-body-sm">
          <summary className="cursor-pointer select-none text-caption text-text-muted hover:text-text-primary">
            Show steps ({steps.length})
          </summary>
          <StepList steps={steps} />
        </details>
      ) : (
        <div className="px-4 pb-4">
          <StepList steps={steps} />
        </div>
      )}
    </figure>
  );
}

function StepList({ steps }: { steps: ReturnType<typeof proofSteps> }) {
  return (
      <ol className="space-y-1.5 pt-1 text-body-sm" aria-label="Proof path steps">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-6">
            {s.names.map((nm, j) => (
              <span key={j} className="inline-flex items-center gap-1.5">
                <span className="font-medium text-text-primary">{nm}</span>
                {j < s.rels.length && (
                  <span className="inline-flex items-center gap-1 text-text-muted">
                    <ArrowRight aria-hidden className="size-3.5 text-proof" />
                    <span>{s.rels[j]}</span>
                    <ArrowRight aria-hidden className="size-3.5 text-proof" />
                  </span>
                )}
              </span>
            ))}
          </li>
        ))}
      </ol>
  );
}
