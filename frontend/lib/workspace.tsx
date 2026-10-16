"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useApi, wsPath } from "@/lib/api";
import type { MeOut, Membership, Role, WorkspaceOut } from "@/lib/types";

export const meQueryKey = ["me"] as const;
export const workspaceQueryKey = (wsId: string) => ["workspace", wsId] as const;

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: meQueryKey, queryFn: ({ signal }) => api<MeOut>("/me", { signal }) });
}

const LAST_WS_KEY = "invarix:last-ws";
export function rememberWorkspace(slug: string) {
  try {
    localStorage.setItem(LAST_WS_KEY, slug);
  } catch {
    /* storage unavailable */
  }
}
export function lastWorkspace(): string | null {
  try {
    return localStorage.getItem(LAST_WS_KEY);
  } catch {
    return null;
  }
}

export interface WorkspaceContextValue {
  wsId: string;
  slug: string;
  name: string;
  role: Role;
  personId: string | null;
  /** Workspace clock, epoch seconds. Null until the workspace record loads. */
  asOf: number | null;
  workspace: WorkspaceOut | undefined;
  membership: Membership;
}

export type WorkspaceResolution =
  | { state: "loading" }
  | { state: "error"; error: unknown; retry: () => void }
  | { state: "not-found" }
  | { state: "provisioning"; membership: Membership }
  | { state: "failed"; membership: Membership }
  | { state: "ready"; value: WorkspaceContextValue; workspaceError: unknown };

/** Resolve a `/w/[ws]` slug to the workspace id via `GET /me` memberships (decision log: slug in URLs). */
export function useResolveWorkspace(slug: string): WorkspaceResolution {
  const api = useApi();
  const me = useMe();
  const membership = me.data?.memberships.find((m) => m.slug === slug || m.workspace_id === slug);
  const ws = useQuery({
    queryKey: workspaceQueryKey(membership?.workspace_id ?? ""),
    queryFn: ({ signal }) => api<WorkspaceOut>(wsPath(membership!.workspace_id), { signal }),
    enabled: !!membership && membership.status === "ready",
  });

  useEffect(() => {
    if (membership?.status === "ready") rememberWorkspace(slug);
  }, [membership?.status, slug]);

  return useMemo<WorkspaceResolution>(() => {
    if (me.isPending) return { state: "loading" };
    if (me.isError) return { state: "error", error: me.error, retry: () => void me.refetch() };
    if (!membership) return { state: "not-found" };
    if (membership.status === "provisioning") return { state: "provisioning", membership };
    if (membership.status === "failed" || membership.status === "deleting") return { state: "failed", membership };
    const w = ws.data;
    return {
      state: "ready",
      workspaceError: ws.error,
      value: {
        wsId: membership.workspace_id,
        slug: membership.slug,
        name: w?.name ?? membership.name,
        role: w?.role ?? membership.role,
        personId: w?.person_id ?? membership.person_id,
        asOf: w?.as_of ?? null,
        workspace: w,
        membership,
      },
    };
  }, [me, membership, ws.data, ws.error]);
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ value, children }: { value: WorkspaceContextValue; children: ReactNode }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error("useWorkspace must be used inside /w/[ws]");
  return v;
}

/** Same as useWorkspace but returns null outside a workspace (shared components). */
export const useOptionalWorkspace = () => useContext(WorkspaceContext);
