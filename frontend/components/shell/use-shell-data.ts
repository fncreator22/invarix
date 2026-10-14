"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, wsPath } from "@/lib/api";
import type { NotificationOut, RiskSummary } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const riskSummaryKey = (wsId: string) => ["risk-summary", wsId] as const;
export const notificationsKey = (wsId: string) => ["notifications", wsId] as const;

export function useRiskSummary() {
  const api = useApi();
  const { wsId } = useWorkspace();
  return useQuery({
    queryKey: riskSummaryKey(wsId),
    queryFn: ({ signal }) => api<RiskSummary>(wsPath(wsId, "/risk/summary"), { signal }),
  });
}

export function useNavCounts() {
  const { data } = useRiskSummary();
  const alerts = data ? Object.values(data.open_alerts).reduce((a, b) => a + b, 0) : undefined;
  return { alerts, reviews: data?.my_reviews };
}

export function useNotifications() {
  const api = useApi();
  const { wsId } = useWorkspace();
  return useQuery({
    queryKey: notificationsKey(wsId),
    queryFn: ({ signal }) => api<NotificationOut[]>(wsPath(wsId, "/notifications"), { signal }),
  });
}

export function useMarkNotificationsRead() {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string | "all") =>
      api<void>(wsPath(wsId, id === "all" ? "/notifications/read-all" : `/notifications/${id}/read`), { method: "POST" }),
    // Optimistic: mark read immediately, roll back on failure (04 §7).
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationsKey(wsId) });
      const prev = qc.getQueryData<NotificationOut[]>(notificationsKey(wsId));
      const now = Math.floor(Date.now() / 1000);
      qc.setQueryData<NotificationOut[]>(notificationsKey(wsId), (old) =>
        old?.map((n) => (id === "all" || n.id === id ? { ...n, read_at: n.read_at ?? now } : n)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(notificationsKey(wsId), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationsKey(wsId) }),
  });
}
