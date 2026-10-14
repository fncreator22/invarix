import type { NodeShape as Shape } from "@/components/entity-meta";

function polygon(cx: number, cy: number, r: number, sides: number, rotate = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotate + (i * 2 * Math.PI) / sides;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function star(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

/** Graph node glyph: each type has a shape so the graph reads without color (05 §3.1.6). */
export function NodeShape({
  shape,
  cx,
  cy,
  r,
  fill,
  stroke,
  strokeWidth = 1.5,
  className,
}: {
  shape: Shape;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const common = { fill, stroke, strokeWidth, className };
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={r} {...common} />;
    case "diamond":
      return <polygon points={polygon(cx, cy, r * 1.15, 4)} {...common} />;
    case "rounded":
      return <rect x={cx - r * 0.9} y={cy - r * 0.9} width={r * 1.8} height={r * 1.8} rx={r * 0.45} {...common} />;
    case "hexagon":
      return <polygon points={polygon(cx, cy, r * 1.05, 6, 0)} {...common} />;
    case "triangle":
      return <polygon points={polygon(cx, cy + r * 0.2, r * 1.2, 3)} {...common} />;
    case "shield":
      return (
        <path
          d={`M${cx} ${cy - r} L${cx + r * 0.9} ${cy - r * 0.6} V${cy + r * 0.05} C${cx + r * 0.9} ${cy + r * 0.6} ${cx + r * 0.4} ${cy + r * 0.9} ${cx} ${cy + r * 1.05} C${cx - r * 0.4} ${cy + r * 0.9} ${cx - r * 0.9} ${cy + r * 0.6} ${cx - r * 0.9} ${cy + r * 0.05} V${cy - r * 0.6} Z`}
          {...common}
        />
      );
    case "star":
      return <polygon points={star(cx, cy, r * 1.2)} {...common} />;
    default:
      return <rect x={cx - r * 0.7} y={cy - r * 0.7} width={r * 1.4} height={r * 1.4} rx={2} {...common} />;
  }
}
