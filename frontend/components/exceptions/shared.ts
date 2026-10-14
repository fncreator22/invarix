"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi, wsPath } from "@/lib/api";
import type { ExceptionKind, PersonRow, ServiceRisk } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const KIND_LABEL: Record<ExceptionKind, string> = {
  security_waiver: "Security waiver",
  flag_override: "Flag override",
  skipped_test: "Skipped test",
  cost_limit_extension: "Cost limit extension",
  data_export_permission: "Data export permission",
  emergency_change: "Emergency change",
};

export type ControlRow = { id: string; name: string; framework?: string; active_waivers: number };

/** People, services and controls for pickers (create form, staged drafts). */
export function useLookups(enabled = true) {
  const api = useApi();
  const { wsId } = useWorkspace();
  const opts = { enabled, staleTime: 60_000 };
  const people = useQuery({ queryKey: ["people", wsId], queryFn: ({ signal }) => api<PersonRow[]>(wsPath(wsId, "/people"), { signal }), ...opts });
  const services = useQuery({ queryKey: ["services", wsId], queryFn: ({ signal }) => api<ServiceRisk[]>(wsPath(wsId, "/services"), { signal }), ...opts });
  const controls = useQuery({ queryKey: ["controls", wsId], queryFn: ({ signal }) => api<ControlRow[]>(wsPath(wsId, "/controls"), { signal }), ...opts });
  return {
    people: (people.data ?? []).filter((p) => p.status === "active"),
    services: services.data ?? [],
    controls: controls.data ?? [],
    loading: people.isPending || services.isPending || controls.isPending,
  };
}

export const toDay = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);
export const fromDay = (d: string) => Date.parse(`${d}T00:00:00Z`) / 1000;
export const selectClass = "h-10 w-full rounded-md border border-border-strong bg-sunken px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-brand";
