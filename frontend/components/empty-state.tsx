import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThinkingOrb, type OrbState } from "@/components/ui/thinking-orb";

/** Abstract constellation line art (05 §2.2): nodes and edges in currentColor. */
export function Constellation({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 96" aria-hidden className={cn("h-24 w-40", className)} fill="none">
      <g stroke="currentColor" strokeOpacity=".35" strokeWidth="1">
        <path d="M20 70 L58 34 L98 52 L138 20 M58 34 L74 80 L98 52 M98 52 L130 76" />
      </g>
      <g fill="currentColor">
        <circle cx="20" cy="70" r="3" fillOpacity=".5" />
        <circle cx="58" cy="34" r="4" />
        <circle cx="98" cy="52" r="5" className="text-proof" fill="var(--proof)" />
        <circle cx="138" cy="20" r="3" fillOpacity=".5" />
        <circle cx="74" cy="80" r="3" fillOpacity=".5" />
        <circle cx="130" cy="76" r="3" fillOpacity=".5" />
      </g>
    </svg>
  );
}

/** 05 §8 EmptyState: icon, illustration, or 64px ThinkingOrb, title, one sentence, one primary action. */
export function EmptyState({
  icon: Icon,
  illustration = false,
  orb = false,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  illustration?: boolean;
  orb?: boolean | OrbState;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {orb ? (
        <div className="mb-4 flex items-center justify-center">
          <ThinkingOrb size={64} state={typeof orb === "string" ? orb : "searching"} />
        </div>
      ) : illustration ? (
        <Constellation className="mb-4 text-brand" />
      ) : (
        Icon && (
          <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon aria-hidden className="size-6" strokeWidth={1.5} />
          </span>
        )
      )}
      <h2 className="font-sans text-h3 font-semibold text-text-primary">{title}</h2>
      {description && <p className="mt-1.5 max-w-md text-body text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
