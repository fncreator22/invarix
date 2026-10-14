"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SentinelState } from "@/components/sentinel-pill";
import { wsPath } from "@/lib/api";
import { useAuthBridge } from "@/lib/auth";
import { openStream } from "@/lib/sse";
import { workspaceQueryKey } from "@/lib/workspace";

/**
 * Workspace SSE (03 §10.4): keeps badges, lists and the Sentinel pill current.
 * Lists refresh in place by invalidating queries; never a full reload.
 */
export function useWorkspaceEvents(wsId: string, enabled: boolean): SentinelState {
  const { getToken } = useAuthBridge();
  const qc = useQueryClient();
  const [sentinel, setSentinel] = useState<SentinelState>("idle");

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    openStream({
      path: wsPath(wsId, "/events"),
      getToken,
      signal: ctrl.signal,
      retry: true,
      openWhenHidden: false,
      onEvent: ({ event, data }) => {
        const d = (data ?? {}) as Record<string, unknown>;
        switch (event) {
          case "sentinel.started":
            setSentinel("running");
            break;
          case "sentinel.finished": {
            setSentinel(d.ok === false ? "failed" : "idle");
            void qc.invalidateQueries({ predicate: (q) => q.queryKey.includes(wsId) });
            const created = Number(d.alerts_created ?? 0);
            if (created > 0) toast(`Sentinel found ${created} new alert${created === 1 ? "" : "s"}`);
            break;
          }
          case "alert.created":
          case "alert.updated":
          case "alert.resolved":
            void qc.invalidateQueries({ queryKey: ["alerts", wsId] });
            void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
            break;
          case "review.assigned":
          case "review.decided":
            void qc.invalidateQueries({ queryKey: ["reviews", wsId] });
            void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
            break;
          case "notification.created":
            void qc.invalidateQueries({ queryKey: ["notifications", wsId] });
            break;
          case "clock.changed":
          case "workspace.provisioning":
            void qc.invalidateQueries({ queryKey: workspaceQueryKey(wsId) });
            break;
        }
      },
    }).catch(() => {
      /* fatal (4xx) or aborted; the rest of the app keeps working without live updates */
    });
    return () => ctrl.abort();
  }, [enabled, getToken, qc, wsId]);

  return sentinel;
}
