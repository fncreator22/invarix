import type { ThemeTokens } from "@/lib/tokens";

/** Node fill: exceptions by severity (1–5), everything else by type token (05 §3.1.6). */
export function nodeColor(n: { label: string; severity?: number | null }, t: ThemeTokens) {
  if (n.label === "Exception") {
    const s = n.severity ?? 1;
    return t.severity[s >= 5 ? "critical" : s >= 4 ? "high" : s >= 3 ? "moderate" : "low"];
  }
  return t.node[n.label as keyof ThemeTokens["node"]] ?? t.textMuted;
}

/** Shape per node type so the graph reads without color (05 §3.1.6). */
export function drawShape(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, r: number) {
  ctx.beginPath();
  const poly = (sides: number, rot = -Math.PI / 2) => {
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * 2 * Math.PI) / sides;
      ctx[i ? "lineTo" : "moveTo"](x + r * Math.cos(a), y + r * Math.sin(a));
    }
    ctx.closePath();
  };
  switch (label) {
    case "Exception":
      poly(4);
      break;
    case "Team":
      poly(6, 0);
      break;
    case "Control":
      poly(3);
      break;
    case "CompensatingControl":
      poly(5);
      break;
    case "CustomerPath":
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r * 1.15;
        ctx[i ? "lineTo" : "moveTo"](x + rr * Math.cos(a), y + rr * Math.sin(a));
      }
      ctx.closePath();
      break;
    case "Person":
    case "Runbook":
    case "Evidence":
      ctx.roundRect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7, label === "Person" ? r * 0.4 : 1);
      break;
    default:
      ctx.arc(x, y, r, 0, 2 * Math.PI);
  }
}


let family = "";
/** Canvas `font` string. Canvas cannot resolve CSS variables, so read the body's computed family once. */
export function canvasFont(px: number, weight = 500) {
  family ||= typeof document === "undefined" ? "system-ui, sans-serif" : getComputedStyle(document.body).fontFamily;
  return `${weight} ${px}px ${family}`;
}

