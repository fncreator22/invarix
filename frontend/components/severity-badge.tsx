import { CircleCheck, OctagonAlert, Siren, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

/** 05 §3.1.3: severity is always icon + word, never color alone. */
export const SEVERITY_META: Record<Severity, { label: string; icon: LucideIcon; text: string; soft: string }> = {
  low: { label: "Low", icon: CircleCheck, text: "text-sev-low", soft: "bg-sev-low-soft" },
  moderate: { label: "Moderate", icon: TriangleAlert, text: "text-sev-moderate", soft: "bg-sev-moderate-soft" },
  high: { label: "High", icon: OctagonAlert, text: "text-sev-high", soft: "bg-sev-high-soft" },
  critical: { label: "Critical", icon: Siren, text: "text-sev-critical", soft: "bg-sev-critical-soft" },
};

export function SeverityBadge({ severity, className }: { severity?: Severity | string | null; className?: string }) {
  const normalizedKey = (severity?.toString().toLowerCase().trim() ?? "moderate") as Severity;
  const meta = SEVERITY_META[normalizedKey] ?? SEVERITY_META.moderate;
  const Icon = meta.icon;
  const badgeVariant = (normalizedKey in SEVERITY_META ? normalizedKey : "moderate") as Severity;

  return (
    <Badge variant={badgeVariant} className={cn(className)}>
      <Icon aria-hidden strokeWidth={1.75} />
      {meta.label}
    </Badge>
  );
}
