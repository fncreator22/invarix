import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * 05 §14.4: a ring with a small gap and a single node at the gap end ("a pause that is easy to forget").
 */
export function LogoMark({
  variant = "aurora",
  className,
  title,
}: {
  variant?: "aurora" | "mono";
  className?: string;
  title?: string;
}) {
  const id = useId();
  const stroke = variant === "aurora" ? `url(#${id})` : "currentColor";
  // Ring from -40° clockwise to 290°, leaving a ~50° gap at the top right; node at the end.
  const r = 11;
  const c = 16;
  const a0 = (-40 * Math.PI) / 180;
  const a1 = (275 * Math.PI) / 180;
  const p = (a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  const end = { x: c + r * Math.cos(a1), y: c + r * Math.sin(a1) };
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {variant === "aurora" && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--aurora-start)" />
            <stop offset="55%" stopColor="var(--aurora-mid)" />
            <stop offset="100%" stopColor="var(--aurora-end)" />
          </linearGradient>
        </defs>
      )}
      <path d={`M ${p(a0)} A ${r} ${r} 0 1 1 ${p(a1)}`} fill="none" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx={end.x} cy={end.y} r="3.2" fill={variant === "aurora" ? "var(--aurora-end)" : "currentColor"} />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[1.2rem] font-bold tracking-[-0.02em] text-text-primary">Reprieve</span>
    </span>
  );
}
