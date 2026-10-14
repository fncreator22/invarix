"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readThemeTokens, type ThemeTokens } from "@/lib/tokens";

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  };
}

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** True when the user asked for reduced motion (05 §12.4). Server render assumes reduced. */
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)", true);

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/** Copy text; `copied` resets after 1.5 s. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }, []);
  return { copied, copy };
}

/** Theme-aware token snapshot; re-reads when the resolved theme changes. Null before mount. */
export function useThemeTokens(): ThemeTokens | null {
  const { resolvedTheme } = useTheme();
  const [tokens, setTokens] = useState<ThemeTokens | null>(null);
  useEffect(() => {
    // next-themes swaps the class before this effect runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external system (CSS variables)
    setTokens(readThemeTokens());
  }, [resolvedTheme]);
  return tokens;
}

/** Real "now" in epoch seconds, re-read every `tickMs` so relative labels stay fresh. */
export function useNowSeconds(tickMs = 30_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);
  return now;
}

import { useQuery } from "@tanstack/react-query";
import { useApi, wsPath } from "@/lib/api";
import type { SimulationForecastOut } from "@/lib/types";

/** Fetches deterministic simulation forecast across temporal horizon and target service. */
export function useSimulationForecast(
  wsId: string,
  horizonDays = 30,
  targetServiceId?: string | null,
  options?: { enabled?: boolean }
) {
  const api = useApi();
  return useQuery({
    queryKey: ["simulation-forecast", wsId, horizonDays, targetServiceId],
    queryFn: ({ signal }) =>
      api<SimulationForecastOut>(
        wsPath(wsId, "/prediction/simulation"),
        {
          signal,
          query: {
            horizon_days: horizonDays,
            target_service_id: targetServiceId ?? undefined,
          },
        }
      ),
    enabled: options?.enabled ?? (!!wsId && horizonDays >= 0),
    staleTime: 15_000,
  });
}
