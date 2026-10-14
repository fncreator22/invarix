import type { Severity } from "@/lib/types";

/** Static values for places CSS variables cannot reach (viewport theme-color, emails). Mirrors globals.css. */
export const STATIC_CANVAS = { light: "#F6F7FA", dark: "#0A0C11" } as const;

/** Read a CSS custom property from :root at runtime (canvas and chart code cannot use classes). */
export function readToken(name: string, el?: Element): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(el ?? document.documentElement).getPropertyValue(name).trim();
}

const NODE_TOKENS = {
  Service: "--node-service",
  Person: "--node-person",
  Team: "--node-team",
  Control: "--node-control",
  CompensatingControl: "--node-compensating",
  CustomerPath: "--node-customer-path",
  Runbook: "--node-runbook",
  Evidence: "--node-runbook",
} as const;

const SEVERITY_TOKENS: Record<Severity, string> = {
  low: "--sev-low",
  moderate: "--sev-moderate",
  high: "--sev-high",
  critical: "--sev-critical",
};

export interface ThemeTokens {
  canvas: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  brand: string;
  proof: string;
  proofSoft: string;
  severity: Record<Severity, string>;
  node: Record<keyof typeof NODE_TOKENS, string>;
  cluster: string[];
}

export function readThemeTokens(): ThemeTokens {
  const map = <T extends Record<string, string>>(o: T) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, readToken(v)])) as Record<keyof T, string>;
  return {
    canvas: readToken("--bg-canvas"),
    surface: readToken("--bg-surface"),
    text: readToken("--text-primary"),
    textMuted: readToken("--text-muted"),
    border: readToken("--border-default"),
    borderStrong: readToken("--border-strong"),
    brand: readToken("--brand"),
    proof: readToken("--proof"),
    proofSoft: readToken("--proof-soft"),
    severity: map(SEVERITY_TOKENS),
    node: map(NODE_TOKENS),
    cluster: Array.from({ length: 8 }, (_, i) => readToken(`--cluster-${i + 1}`)),
  };
}
