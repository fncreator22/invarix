"use client";

import { useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { canvasFont, drawShape, nodeColor } from "@/lib/graph-draw";
import type { ThemeTokens } from "@/lib/tokens";

export type HeroNode = { id: string; label: string; name: string; severity?: number; story: string; x?: number; y?: number; fx?: number; fy?: number };
export type HeroLink = { source: string | HeroNode; target: string | HeroNode; path?: boolean };
export const idOf = (v: string | HeroNode) => (typeof v === "string" ? v : v.id);

/** Canvas part of the hero graph, loaded via next/dynamic as a whole module so the ForceGraph ref works. */
export default function HeroCanvas({
  size,
  data,
  tokens,
  lit,
  hover,
  selected,
  still,
  onHover,
  onSelect,
}: {
  size: { w: number; h: number };
  data: { nodes: HeroNode[]; links: HeroLink[] };
  tokens: ThemeTokens;
  lit: (id: string) => boolean;
  hover: string | null;
  selected: string;
  still: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const fg = useRef<ForceGraphMethods<HeroNode, HeroLink> | undefined>(undefined);
  const tuned = useRef(false);

  return (
    <ForceGraph2D<HeroNode, HeroLink>
      ref={fg}
      width={size.w}
      height={size.h}
      graphData={data}
      backgroundColor="rgba(0,0,0,0)"
      enableZoomInteraction={false}
      enablePanInteraction={false}
      autoPauseRedraw={false}
      cooldownTicks={160}
      onEngineTick={() => {
        if (tuned.current || !fg.current) return;
        tuned.current = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- d3 force accessors are untyped
        const g = fg.current as any;
        g.d3Force("charge")?.strength(-260);
        g.d3Force("link")?.distance(80);
        g.d3ReheatSimulation();
      }}
      onEngineStop={() => fg.current?.zoomToFit(500, 56)}
      onNodeHover={(n) => onHover(n?.id ?? null)}
      onNodeClick={(n) => onSelect(n.id)}
      onNodeDragEnd={(n) => {
        // release the pin so the node springs back into the layout
        n.fx = undefined;
        n.fy = undefined;
        fg.current?.d3ReheatSimulation();
      }}
      linkColor={(l) => {
        const on = lit(idOf(l.source)) && lit(idOf(l.target));
        if (l.path) return on ? tokens.proof : tokens.border;
        return on ? tokens.borderStrong : tokens.border;
      }}
      linkWidth={(l) => (l.path ? 3 : 1.2)}
      linkDirectionalParticles={(l) => (l.path && !still ? 2 : 0)}
      linkDirectionalParticleWidth={4.5}
      linkDirectionalParticleSpeed={0.007}
      linkDirectionalParticleColor={() => tokens.proof}
      nodeCanvasObject={(n, ctx, scale) => {
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const service = n.label === "Service";
        const r = (service ? 11 : 8) / scale; // screen-pixel size at any zoom
        ctx.globalAlpha = lit(n.id) ? 1 : 0.18;
        if (service || n.id === selected) {
          const pulse = still ? 0 : (Math.sin(Date.now() / 600 + x) + 1) / 2;
          ctx.beginPath();
          ctx.arc(x, y, r + (7 + pulse * 4) / scale, 0, 2 * Math.PI);
          ctx.fillStyle = n.id === selected ? tokens.proofSoft : `${tokens.brand}22`;
          ctx.fill();
        }
        drawShape(ctx, n.label, x, y, r);
        ctx.fillStyle = nodeColor(n, tokens);
        ctx.fill();
        if (n.id === selected || n.id === hover) {
          ctx.lineWidth = 2 / scale;
          ctx.strokeStyle = tokens.proof;
          ctx.stroke();
        }
        ctx.font = canvasFont(12 / scale, n.id === hover ? 600 : 500);
        ctx.textAlign = "center";
        ctx.fillStyle = n.id === hover ? tokens.text : tokens.textMuted;
        ctx.fillText(n.name, x, y + r + 14 / scale);
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
