"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAuthBridge } from "@/lib/auth";
import type { ErrorCode, ProblemDetails } from "@/lib/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const API_BASE = `${API_URL}/api/v1`;

const FALLBACK_CODE: Record<number, ErrorCode> = {
  401: "UNAUTHENTICATED",
  402: "QUOTA_EXCEEDED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "VERSION_CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;
  readonly requestId: string | null;
  readonly errors: NonNullable<ProblemDetails["errors"]>;
  readonly title: string;
  readonly retryAfter: number | null;

  constructor(init: {
    status: number;
    code: string;
    title: string;
    detail?: string | null;
    requestId?: string | null;
    errors?: ProblemDetails["errors"];
    retryAfter?: number | null;
  }) {
    super(init.detail || init.title);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.requestId = init.requestId ?? null;
    this.errors = init.errors ?? [];
    this.retryAfter = init.retryAfter ?? null;
  }

  /** Field → message map for React Hook Form `setError`. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.errors) if (e.field && e.message) out[String(e.field)] = String(e.message);
    return out;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Network failure (no response): the API is unreachable or the browser is offline. */
export class NetworkError extends Error {
  constructor(message = "The server could not be reached.") {
    super(message);
    this.name = "NetworkError";
  }
}

// ------------------------------------------------------------------ connection status store
// Tiny external store so the shell can show the cold-start card and session modal.
interface ApiStatus {
  waking: boolean;
  sessionExpired: boolean;
}
let status: ApiStatus = { waking: false, sessionExpired: false };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<ApiStatus>) {
  const next = { ...status, ...patch };
  if (next.waking === status.waking && next.sessionExpired === status.sessionExpired) return;
  status = next;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER_STATUS: ApiStatus = { waking: false, sessionExpired: false };
export function useApiStatus(): ApiStatus {
  return useSyncExternalStore(subscribe, () => status, () => SERVER_STATUS);
}
export const clearSessionExpired = () => setStatus({ sessionExpired: false });
export const markSessionExpired = () => setStatus({ sessionExpired: true });

// ------------------------------------------------------------------ request
export type TokenGetter = () => Promise<string | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Resource version for optimistic concurrency (03 §10.1). */
  ifMatch?: number | string;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Total time budget for cold-start retries, ms. 0 disables retries. */
  wakeBudgetMs?: number;
}

const COLD_START_BUDGET_MS = 75_000;
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

export const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

export async function toApiError(res: Response, requestId: string): Promise<ApiError> {
  let body: Partial<ProblemDetails> = {};
  try {
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("json")) body = (await res.json()) as Partial<ProblemDetails>;
  } catch {
    /* non-JSON error body */
  }
  const retryAfter = Number(res.headers.get("retry-after"));
  return new ApiError({
    status: res.status,
    code: body.code ?? FALLBACK_CODE[res.status] ?? "INTERNAL",
    title: body.title ?? (res.statusText || "Request failed"),
    detail: body.detail,
    requestId: body.request_id ?? res.headers.get("x-request-id") ?? requestId,
    errors: body.errors,
    retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  });
}

/**
 * Fetch an API path. Adds auth, request id, `If-Match`; parses problem+json into `ApiError`.
 * Cold start (Render free tier): network failure, 502 or 503 without a problem body → retry with
 * backoff and expose `waking` through `useApiStatus()`.
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}, getToken?: TokenGetter): Promise<T> {
  const method = opts.method ?? "GET";
  const url = buildUrl(path, opts.query);
  const budget = opts.wakeBudgetMs ?? COLD_START_BUDGET_MS;
  // Network errors on writes are only retried when the server can de-duplicate them.
  const safeToRetryNetwork = method === "GET" || !!opts.idempotencyKey;
  const started = Date.now();
  let attempt = 0;

  for (;;) {
    const requestId = newRequestId();
    const headers: Record<string, string> = { Accept: "application/json", "X-Request-ID": requestId };
    const token = getToken ? await getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

    let res: Response | null = null;
    let networkFailed = false;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: opts.signal,
      });
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      networkFailed = true;
    }

    const isProblem = !!res && (res.headers.get("content-type") ?? "").includes("problem+json");
    const coldStart =
      (networkFailed && safeToRetryNetwork) || (!!res && (res.status === 502 || res.status === 503) && !isProblem);

    if (coldStart && budget > 0 && Date.now() - started < budget) {
      setStatus({ waking: true });
      attempt += 1;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000), opts.signal);
      continue;
    }
    if (networkFailed || !res) {
      setStatus({ waking: false });
      throw new NetworkError();
    }
    setStatus({ waking: false });

    if (!res.ok) {
      const err = await toApiError(res, requestId);
      if (err.code === "UNAUTHENTICATED") {
        const rawPath = typeof window !== "undefined" ? window.location.pathname : "";
        const path = decodeURIComponent(rawPath).toLowerCase().replace(/\s+/g, "-");
        if (!path.startsWith("/onboarding") && !path.startsWith("/sign-in") && !path.startsWith("/sign-up") && !path.startsWith("/w/northwind-pay")) {
          markSessionExpired();
        }
      }
      throw err;
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

export type ApiRequest = <T>(path: string, opts?: RequestOptions) => Promise<T>;

/** `apiFetch` bound to the current Clerk session. */
export function useApi(): ApiRequest {
  const { getToken } = useAuthBridge();
  return useMemo<ApiRequest>(
    () =>
      <T,>(path: string, opts?: RequestOptions) =>
        apiFetch<T>(path, opts, getToken),
    [getToken],
  );
}

/** Workspace-scoped API path: `/workspaces/{ws}/…`. */
export const wsPath = (wsId: string, path = "") =>
  `/workspaces/${encodeURIComponent(wsId)}${path && !path.startsWith("/") ? "/" : ""}${path}`;

/** Fire-and-forget pre-warm (04 §4.1). Health lives at the API root. */
let warmed = false;
export function prewarmApi() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  fetch(`${API_URL}/health`, { method: "GET", mode: "cors", keepalive: true }).catch(() => {});
}
