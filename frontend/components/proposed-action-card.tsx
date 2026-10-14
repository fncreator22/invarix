"use client";

import { useState } from "react";
import { Check, CircleCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelativeDate } from "@/components/relative-date";
import { errorMessage } from "@/lib/errors";
import { useNowSeconds } from "@/lib/hooks";
import { hasRole, type ProposedAction, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

function describePayload(payload: Record<string, unknown>): [string, string][] {
  return Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 5)
    .map(([k, v]) => [k.replace(/_/g, " "), String(v)]);
}

/**
 * 05 §8 ProposedActionCard: dashed proof border, explicit Approve / Dismiss.
 * Nothing changes until a human approves (PRD principle "humans decide").
 */
export function ProposedActionCard({
  action,
  role,
  onApprove,
  onDismiss,
  className,
}: {
  action: ProposedAction;
  /** Viewer's role; the Approve control is hidden below `requires_role`. */
  role?: Role;
  onApprove: (action: ProposedAction) => Promise<unknown>;
  onDismiss?: (action: ProposedAction) => void;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "approving" | "approved" | "error">("idle");
  const [approvedAt, setApprovedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNowSeconds();
  const canApprove = role === undefined || hasRole(role, action.requires_role);
  const effects = describePayload(action.payload);

  async function approve() {
    setState("approving");
    setError(null);
    try {
      await onApprove(action);
      setApprovedAt(Math.floor(Date.now() / 1000));
      setState("approved");
    } catch (e) {
      setError(errorMessage(e));
      setState("error");
    }
  }

  const approved = state === "approved";
  return (
    <section
      aria-label={`Proposed action: ${action.title}`}
      className={cn(
        "rounded-lg border-2 bg-surface p-4 transition-colors",
        approved ? "border-solid border-sev-low/60" : "border-dashed border-proof/60",
        className,
      )}
    >
      <p className={cn("eyebrow", approved ? "text-sev-low" : "text-proof")}>
        {approved ? "Approved" : "Proposed by Steward"}
      </p>
      <h3 className="mt-1 text-h3 font-semibold text-text-primary">{action.title}</h3>
      {effects.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
          {effects.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-text-muted first-letter:uppercase">{k}</dt>
              <dd className="truncate font-mono text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {approved ? (
        <p className="mt-4 flex items-center gap-2 text-body-sm text-sev-low" role="status">
          <CircleCheck aria-hidden className="size-4" />
          Approved {approvedAt && <RelativeDate value={approvedAt} asOf={now} />}
        </p>
      ) : (
        <>
          <p className="mt-3 text-body-sm text-text-secondary">Nothing changes until you approve.</p>
          {error && (
            <p className="mt-2 text-body-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canApprove ? (
              <Button size="sm" onClick={approve} loading={state === "approving"}>
                <Check aria-hidden />
                Approve
              </Button>
            ) : (
              <p className="text-body-sm text-text-muted">Needs the {action.requires_role} role to approve.</p>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={() => onDismiss(action)} disabled={state === "approving"}>
                <X aria-hidden />
                Dismiss
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
