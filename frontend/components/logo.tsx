import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * INVARIX Brand Logo Mark:
 * Geometric Invariant Nexus Shield with dual intersecting causal vectors
 * and central diamond interception node.
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
  
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {variant === "aurora" && (
        <defs>
          <linearGradient id={id} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6353E8" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      )}
      
      {/* Outer Invariant Shield */}
      <polygon 
        points="16,3 27,9 27,23 16,29 5,23 5,9" 
        stroke={stroke} 
        strokeWidth="1.8" 
        strokeLinejoin="round"
        fill={variant === "aurora" ? "#0C0D14" : "none"} 
      />
      
      {/* Invariant Intercepting Vectors */}
      <path 
        d="M 9.5 10.5 L 16 15.5 L 22.5 10.5" 
        stroke={variant === "aurora" ? "#38BDF8" : "currentColor"} 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M 9.5 21.5 L 16 16.5 L 22.5 21.5" 
        stroke={stroke} 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Central Diamond Nexus */}
      <polygon points="16,14 18,16 16,18 14,16" fill="#FFFFFF" />

      {/* Vertex Anchors */}
      <circle cx="16" cy="3" r="1.2" fill={variant === "aurora" ? "#06B6D4" : "currentColor"} />
      <circle cx="27" cy="9" r="1.2" fill={variant === "aurora" ? "#8B5CF6" : "currentColor"} />
      <circle cx="27" cy="23" r="1.2" fill={variant === "aurora" ? "#6353E8" : "currentColor"} />
      <circle cx="16" cy="29" r="1.2" fill={variant === "aurora" ? "#06B6D4" : "currentColor"} />
      <circle cx="5" cy="23" r="1.2" fill={variant === "aurora" ? "#6353E8" : "currentColor"} />
      <circle cx="5" cy="9" r="1.2" fill={variant === "aurora" ? "#8B5CF6" : "currentColor"} />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[1.25rem] font-extrabold tracking-[0.06em] text-white uppercase">
        INVARIX
      </span>
    </span>
  );
}
