"use client";

import { useEffect } from "react";
import { ServerErrorView } from "@/components/system/status-views";
import { requestIdOf } from "@/lib/errors";

/** SCR-X-06: friendly message, copyable request ID, Retry. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center">
      <ServerErrorView requestId={requestIdOf(error) ?? error.digest ?? null} onRetry={reset} />
    </main>
  );
}
