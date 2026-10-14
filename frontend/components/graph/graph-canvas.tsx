"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { canvasFont, drawShape, nodeColor } from "@/lib/graph-draw";
import type { ThemeTokens } from "@/lib/tokens";
import type { CanvasNodeDecoration, GraphOut } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GNode = GraphOut["nodes"][number] & { x?: number; y?: number; fx?: number; fy?: number };
export type GLink = { source: string | GNode; target: string | GNode; type: string };
const idOf = (v: string | GNode) => (typeof v === "string" ? v : v.id);

/**
 * Explorer canvas, loaded whole via next/dynamic so its ForceGraph ref works (zoom-to-fit, zoom buttons).
 * Grab cursor, hover lights neighbours + labels, drag springs back, particles run along the proof path.
 */
export default function GraphCanvas({
  data,
  tokens,
  size,
  pathLinks,
  pathSet,
  progress,
  focus,
  still,
  decorations,
  onOpen,
  onSelectDecoration,
}: {
  data: { nodes: GNode[]; links: GLink[] };
  tokens: ThemeTokens;
  size: { w: number; h: number };
  pathLinks: GLink[];
  pathSet: Set<string>;
  progress: number;
  focus: string | null;
  still: boolean;
  decorations?: Record<string, CanvasNodeDecoration>;
  onOpen: (id: string) => void;
  onSelectDecoration?: (id: string) => void;
}) {
  const fg = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined);
  const tuned = useRef(false);
  const [hover, setHover] = useState<string | null>(null);
  const neighbours = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const l of data.links) {
      (m[idOf(l.source)] ??= new Set()).add(idOf(l.target));
      (m[idOf(l.target)] ??= new Set()).add(idOf(l.source));
    }
    return m;
  }, [data.links]);
  const pathActive = pathSet.size > 0;
  const lit = (id: string) => (hover ? id === hover || !!neighbours[hover]?.has(id) : !pathActive || pathSet.has(id));
  const drawn = (l: GLink) => {
    const i = pathLinks.indexOf(l);
    return i >= 0 && i < progress * pathLinks.length;
  };

  return (
    <div className={cn("relative h-full w-full", hover ? "cursor-pointer" : "cursor-grab active:cursor-grabbing")}>
      <ForceGraph2D<GNode, GLink>
        ref={fg}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={160}
        autoPauseRedraw={false}
        minZoom={0.3}
        maxZoom={6}
        onEngineTick={() => {
          if (tuned.current || !fg.current) return;
          tuned.current = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3 force accessors are untyped
          const g = fg.current as any;
          g.d3Force("charge")?.strength(-90).distanceMax(220);
          g.d3Force("link")?.distance(36);
          // gravity keeps nodes without links near the cluster, so the fitted view stays readable
          let nodes: GNode[] = [];
          g.d3Force(
            "gravity",
            Object.assign(
              (alpha: number) => {
                for (const n of nodes as (GNode & { vx: number; vy: number })[]) {
                  n.vx -= (n.x ?? 0) * 0.06 * alpha;
                  n.vy -= (n.y ?? 0) * 0.06 * alpha;
                }
              },
              { initialize: (ns: GNode[]) => (nodes = ns) },
            ),
          );
          g.d3ReheatSimulation();
        }}
        onEngineStop={() => fg.current?.zoomToFit(500, 40, (n) => !pathActive || pathSet.has(n.id))}
        onNodeHover={(n) => setHover(n?.id ?? null)}
        onNodeClick={(n) => {
          if (decorations?.[n.id] && onSelectDecoration) {
            onSelectDecoration(n.id);
          }
          onOpen(n.id);
        }}
        onNodeDragEnd={(n) => {
          // springs back into the layout instead of staying pinned
          n.fx = undefined;
          n.fy = undefined;
          fg.current?.d3ReheatSimulation();
        }}
        nodeLabel={(n) => {
          const dec = decorations?.[n.id];
          if (dec?.spof_rank) {
            return `${n.label}: ${n.name} (SPOF Rank #${dec.spof_rank}, Simulated Risk: ${dec.simulated_score}/100)`;
          }
          return `${n.label}: ${n.name}`;
        }}
        linkColor={(l) => {
          if (pathLinks.includes(l)) return drawn(l) ? tokens.proof : tokens.border;
          return lit(idOf(l.source)) && lit(idOf(l.target)) ? tokens.borderStrong : tokens.border;
        }}
        linkWidth={(l) => (drawn(l) ? 2.5 : hover && (idOf(l.source) === hover || idOf(l.target) === hover) ? 1.8 : 1)}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(l) => {
          if (drawn(l) && !still) return 2;
          const sDec = decorations?.[idOf(l.source)];
          const tDec = decorations?.[idOf(l.target)];
          if ((sDec?.pulse || tDec?.pulse) && !still) return 2;
          return 0;
        }}
        linkDirectionalParticleWidth={3.5}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleColor={(l) => {
          if (pathLinks.includes(l)) return tokens.proof;
          const sDec = decorations?.[idOf(l.source)];
          if (sDec?.color) return sDec.color;
          return tokens.proof;
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          const on = lit(n.id);
          const dec = decorations?.[n.id];
          const r = (n.label === "Service" ? 7 + (n.score ?? 0) / 18 : 6) / Math.min(scale, 1.6);
          ctx.globalAlpha = on ? 1 : 0.18;
          if (dec?.pulse) {
            ctx.beginPath();
            const pulseOffset = still ? 3 : Math.sin(Date.now() / 250) * 2.5 + 3.5;
            ctx.arc(x, y, r + pulseOffset / scale, 0, 2 * Math.PI);
            ctx.fillStyle = dec.pulse_color || `${tokens.severity[dec.risk_band] || tokens.severity.critical}33`;
            ctx.fill();
          } else if (n.id === hover || n.id === focus) {
            ctx.beginPath();
            ctx.arc(x, y, r + 6 / scale, 0, 2 * Math.PI);
            ctx.fillStyle = `${tokens.brand}33`;
            ctx.fill();
          }
          drawShape(ctx, n.label, x, y, r);
          ctx.fillStyle = dec?.color || nodeColor(n, tokens);
          ctx.fill();
          if (pathSet.has(n.id) || n.id === focus || n.id === hover || dec?.pulse) {
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = pathSet.has(n.id) ? tokens.proof : dec?.color || tokens.brand;
            ctx.stroke();
          }
          const showLabel = n.id === hover || n.id === focus || pathSet.has(n.id) || scale > 1.4 || (n.label === "Service" && scale > 0.8) || (hover && on) || (dec && dec.simulated_score > 50);
          if (showLabel) {
            ctx.font = canvasFont(11 / scale, n.id === hover ? 600 : 500);
            ctx.textAlign = "center";
            ctx.fillStyle = n.id === hover ? tokens.text : tokens.textMuted;
            const extra = dec?.spof_rank ? ` #${dec.spof_rank}` : "";
            const baseName = n.name.length > 24 ? `${n.name.slice(0, 23)}…` : n.name;
            ctx.fillText(`${baseName}${extra}`, x, y + r + 11 / scale);
          }
          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(n, color, ctx, scale) => {
          // generous hit area so nodes are easy to grab
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, 14 / scale, 0, 2 * Math.PI);
          ctx.fill();
        }}
      />
      <div className="glass absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-border-subtle">
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => fg.current?.zoom(fg.current.zoom() * 1.4, 300)} className="flex size-9 items-center justify-center text-text-secondary hover:bg-brand-soft hover:text-text-primary">
          <Plus className="size-4" aria-hidden />
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => fg.current?.zoom(fg.current.zoom() / 1.4, 300)} className="flex size-9 items-center justify-center text-text-secondary hover:bg-brand-soft hover:text-text-primary">
          <Minus className="size-4" aria-hidden />
        </button>
        <button type="button" aria-label="Fit to screen" title="Fit to screen" onClick={() => fg.current?.zoomToFit(500, 40)} className="flex size-9 items-center justify-center text-text-secondary hover:bg-brand-soft hover:text-text-primary">
          <Maximize2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
