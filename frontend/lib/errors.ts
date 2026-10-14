import { isApiError, NetworkError } from "@/lib/api";
import type { ErrorCode } from "@/lib/types";

/** How the UI reacts to each error code (04 §7, 03 §10.6). */
export type ErrorBehavior =
  | "session-modal" // SCR-X-03
  | "verify-email" // redirect to SCR-A-02
  | "not-found" // SCR-X-01
  | "forbidden" // SCR-X-02 or inline "needs role"
  | "field-errors" // map errors[] onto fields
  | "conflict-banner" // "This changed since you opened it" + Reload
  | "invariant-dialog" // dialog with the specific reason
  | "data-missing" // SCR-X-04
  | "provisioning" // SCR-X-05
  | "quota-dialog"
  | "rate-limit-toast"
  | "degraded-banner" // AI down: banner + Quick answers
  | "ai-disabled-panel"
  | "server-error" // SCR-X-06 with request id
  | "offline"; // SCR-X-07

export const ERROR_BEHAVIOR: Record<ErrorCode, ErrorBehavior> = {
  UNAUTHENTICATED: "session-modal",
  EMAIL_NOT_VERIFIED: "verify-email",
  NOT_FOUND: "not-found",
  FORBIDDEN: "forbidden",
  VALIDATION_ERROR: "field-errors",
  VERSION_CONFLICT: "conflict-banner",
  INVARIANT_VIOLATION: "invariant-dialog",
  WORKSPACE_DATA_MISSING: "data-missing",
  WORKSPACE_PROVISIONING: "provisioning",
  QUOTA_EXCEEDED: "quota-dialog",
  RATE_LIMITED: "rate-limit-toast",
  LLM_UNAVAILABLE: "degraded-banner",
  AI_DISABLED: "ai-disabled-panel",
  INTERNAL: "server-error",
};

/** Calm, user-facing copy (05 §16). The server's `detail` is preferred where it is specific. */
const MESSAGES: Record<ErrorBehavior, string> = {
  "session-modal": "You were signed out for safety. Sign in again to continue.",
  "verify-email": "Verify your email address to continue.",
  "not-found": "We can't find that.",
  forbidden: "You don't have access to this action.",
  "field-errors": "Some fields need attention.",
  "conflict-banner": "This changed since you opened it. Reload to see the latest version.",
  "invariant-dialog": "This change isn't allowed in the current state.",
  "data-missing": "This workspace needs to be restored.",
  provisioning: "This workspace is still being set up.",
  "quota-dialog": "You've reached a plan limit.",
  "rate-limit-toast": "Too many requests. Try again in a moment.",
  "degraded-banner": "The AI assistant is unavailable right now. Quick answers still work.",
  "ai-disabled-panel": "AI is turned off for this workspace.",
  "server-error": "Something went wrong on our side. Try again.",
  offline: "You're offline. Changes can't be saved.",
};

export function errorBehavior(err: unknown): ErrorBehavior {
  if (err instanceof NetworkError) return "offline";
  if (isApiError(err)) return ERROR_BEHAVIOR[err.code as ErrorCode] ?? "server-error";
  return "server-error";
}

export function errorMessage(err: unknown): string {
  const behavior = errorBehavior(err);
  if (isApiError(err)) {
    if (behavior === "rate-limit-toast" && err.retryAfter) return `Too many requests. Try again in ${err.retryAfter} s.`;
    // Specific server reasons are useful for these; generic codes keep our copy.
    if ((behavior === "invariant-dialog" || behavior === "quota-dialog" || behavior === "forbidden") && err.message)
      return err.message;
  }
  return MESSAGES[behavior];
}

export const requestIdOf = (err: unknown) => (isApiError(err) ? err.requestId : null);
