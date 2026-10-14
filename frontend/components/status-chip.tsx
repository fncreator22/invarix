import {
  Ban,
  BellOff,
  Check,
  CircleSlash,
  Clock,
  Repeat,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatShortDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertStatus, EffectiveStatus, ReviewOut } from "@/lib/types";

export type ChipStatus = EffectiveStatus | AlertStatus | ReviewOut["status"] | "proposed";

type Meta = {
  label: string;
  variant: "low" | "moderate" | "critical" | "default" | "neutral" | "dashed" | "outline" | "info";
  icon?: LucideIcon;
  dot?: string;
};

/** 05 §3.1.4 status styles. Every status carries a word, most carry an icon. */
const META: Record<ChipStatus, Meta> = {
  active: { label: "Active", variant: "outline", dot: "bg-sev-low" },
  expiring: { label: "Expiring", variant: "moderate", icon: Clock },
  expired: { label: "Expired", variant: "critical", icon: TriangleAlert },
  renewed: { label: "Renewed", variant: "default", icon: Repeat },
  revoked: { label: "Revoked", variant: "neutral", icon: Ban },
  closed: { label: "Closed", variant: "neutral", icon: CircleSlash },
  draft: { label: "Draft", variant: "dashed" },
  proposed: { label: "Proposed", variant: "dashed" },
  snoozed: { label: "Snoozed", variant: "neutral", icon: BellOff },
  open: { label: "Open", variant: "outline", dot: "bg-brand" },
  acknowledged: { label: "Acknowledged", variant: "neutral", icon: Check },
  resolved: { label: "Resolved", variant: "low", icon: Check },
  pending: { label: "Pending", variant: "moderate", icon: Clock },
  decided: { label: "Decided", variant: "low", icon: Check },
  cancelled: { label: "Cancelled", variant: "neutral", icon: CircleSlash },
};

export function StatusChip({
  status,
  date,
  className,
}: {
  status: ChipStatus;
  /** Expiry for expired/expiring, until-date for snoozed (epoch seconds). */
  date?: number | null;
  className?: string;
}) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <Badge
      variant={meta.variant}
      className={cn(meta.variant === "outline" && status === "active" && "border-sev-low/60 text-sev-low", className)}
    >
      {meta.dot && <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />}
      {Icon && <Icon aria-hidden strokeWidth={1.75} />}
      {meta.label}
      {date != null && (
        <span className={cn("tabular opacity-90", status === "expired" && "line-through")}>
          {status === "snoozed" ? "until " : ""}
          {formatShortDay(date)}
        </span>
      )}
    </Badge>
  );
}
