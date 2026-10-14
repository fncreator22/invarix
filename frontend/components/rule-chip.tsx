import { CalendarRange, Clock, Layers, Link2, Repeat, Route, ShieldOff, UserX, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RuleId } from "@/lib/types";

/** 05 §3.1.5 / 03 §8.1. Rule identity is text + icon, never color. */
export const RULES: Record<RuleId, { short: string; name: string; icon: LucideIcon }> = {
  R1: { short: "Expiry", name: "Expired, expiring, or condition met", icon: Clock },
  R2: { short: "Orphaned owner", name: "Owner has left or is inactive", icon: UserX },
  R3: { short: "Shared fallback", name: "Several exceptions rely on one fallback", icon: Link2 },
  R4: { short: "Concentration", name: "Exceptions pile up on one service", icon: Layers },
  R5: { short: "Treadmill", name: "Renewed again and again", icon: Repeat },
  R6: { short: "Collision", name: "Several expiries in the same week", icon: CalendarRange },
  R7: { short: "Broken control", name: "Compensating control missing or stale", icon: ShieldOff },
  R8: { short: "Customer path", name: "Exposure on a customer-facing path", icon: Route },
};

export const isRuleId = (v: string): v is RuleId => v in RULES;

export function RuleChip({ rule, compact = false }: { rule: RuleId; compact?: boolean }) {
  const meta = RULES[rule];
  const Icon = meta.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="neutral" tabIndex={0} aria-label={`${rule}: ${meta.name}`}>
          <Icon aria-hidden strokeWidth={1.75} />
          <span className="font-mono">{rule}</span>
          {!compact && <span>{meta.short}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{meta.name}</TooltipContent>
    </Tooltip>
  );
}
