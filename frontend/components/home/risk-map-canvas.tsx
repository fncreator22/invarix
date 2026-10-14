"use client";

import { useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { canvasFont } from "@/lib/graph-draw";
import type { ThemeTokens } from "@/lib/tokens";
import { bandFor, type GraphOut } from "@/lib/types";

type N = { id: string; name: string; score: number; x?: number; y?: number; fx?: number; fy?: number };
type L = { source: string | N; target: string | N };
const idOf = (v: string | N) => (typeof v === "string" ? v : v.id);

/** Services sized and colored by risk band, linked by dependencies. Loaded whole via next/dynamic (ref works). */
export default function RiskMapCanvas({
  graph,
  tokens,
  size,
  selected,
  onSelect,
}: {
  graph: GraphOut;
  tokens: ThemeTokens;
  size: { w: number; h: number };
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const fg = useRef<ForceGraphMethods<N, L> | undefined>(undefined);
  const hover = useRef<string | null>(null);
  const tuned = useRef(false);
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ id: n.id, name: n.name, score: n.score ?? 0 })),
      links: graph.edges.filter((e) => e.type === "DEPENDS_ON").map((e) => ({ source: e.from, target: e.to })),
    }),
    [graph],
  );
  const near = (id: string) => {
    const h = hover.current; // dim only while hovering; the selection is shown with a ring
    if (!h) return true;
    return id === h || data.links.some((l) => (idOf(l.source) === h && idOf(l.target) === id) || (idOf(l.target) === h && idOf(l.source) === id));
  };

  return (
    <ForceGraph2D<N, L>
      ref={fg}
      width={size.w}
      height={size.h}
      graphData={data}
      backgroundColor="rgba(0,0,0,0)"
      enableZoomInteraction={false}
      enablePanInteraction={false}
      cooldownTicks={150}
      onEngineTick={() => {
        if (tuned.current || !fg.current) return;
        tuned.current = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3 force accessors are untyped
        const g = fg.current as any;
        g.d3Force("charge")?.strength(-140).distanceMax(140); // short-range repulsion: loners are not flung outward
        g.d3Force("link")?.distance(42);
        // gentle gravity so services without dependencies stay near the cluster (keeps zoom-to-fit readable)
        let nodes: N[] = [];
        const gravity = Object.assign(
          (alpha: number) => {
            for (const n of nodes) {
              (n as N & { vx: number }).vx -= (n.x ?? 0) * 0.12 * alpha;
              (n as N & { vy: number }).vy -= (n.y ?? 0) * 0.12 * alpha;
            }
          },
          { initialize: (ns: N[]) => (nodes = ns) },
        );
        g.d3Force("gravity", gravity);
        g.d3ReheatSimulation();
      }}
      onEngineStop={() => fg.current?.zoomToFit(400, 30)}
      onNodeHover={(n) => {
        hover.current = n?.id ?? null;
      }}
      onNodeClick={(n) => onSelect(n.id)}
      onNodeDragEnd={(n) => {
        n.fx = undefined;
        n.fy = undefined;
        fg.current?.d3ReheatSimulation();
      }}
      linkColor={(l) => (near(idOf(l.source)) && near(idOf(l.target)) ? tokens.borderStrong : tokens.border)}
      linkDirectionalArrowLength={3}
      linkDirectionalArrowRelPos={1}
      nodeCanvasObject={(n, ctx, scale) => {
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const r = (5 + (n.score / 100) * 9) / scale;
        ctx.globalAlpha = near(n.id) ? 1 : 0.25;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = tokens.severity[bandFor(n.score)];
        ctx.fill();
        if (n.id === selected) {
          ctx.lineWidth = 3 / scale;
          ctx.strokeStyle = tokens.proof;
          ctx.stroke();
        }
        if (n.score >= 50 || n.id === selected || n.id === hover.current) {
          ctx.font = canvasFont(11 / scale, n.id === selected ? 600 : 500);
          ctx.textAlign = "center";
          ctx.fillStyle = tokens.textMuted;
          ctx.fillText(n.name, x, y + r + 11 / scale);
        }
        ctx.globalAlpha = 1;
      }}
      nodePointerAreaPaint={(n, color, ctx, scale) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x ?? 0, n.y ?? 0, 16 / scale, 0, 2 * Math.PI);
        ctx.fill();
      }}
    />
  );
}
