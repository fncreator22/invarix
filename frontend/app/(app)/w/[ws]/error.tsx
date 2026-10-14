"use client";

import { ServerErrorView } from "@/components/system/status-views";
import { errorMessage, requestIdOf } from "@/lib/errors";

/** Errors inside a workspace page keep the shell; only the content area shows SCR-X-06. */
export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ServerErrorView requestId={requestIdOf(error) ?? error.digest ?? null} message={errorMessage(error)} onRetry={reset} />;
}
