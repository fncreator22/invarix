"use client";

import { EventStreamContentType, fetchEventSource } from "@microsoft/fetch-event-source";
import { API_BASE, ApiError, markSessionExpired, newRequestId, toApiError, type TokenGetter } from "@/lib/api";

export interface SseEvent<T = unknown> {
  event: string;
  data: T;
  id?: string;
}

export interface StreamOptions {
  /** API path under /api/v1 (or absolute URL). */
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  getToken: TokenGetter;
  signal: AbortSignal;
  onEvent: (e: SseEvent) => void;
  onOpen?: () => void;
  /** Called for transient failures; return a delay in ms to retry, or nothing to use the default. */
  onRetry?: (err: unknown) => void;
  /** Keep the connection when the tab is hidden (workspace events should; chat does not need to). */
  openWhenHidden?: boolean;
  /** Reconnect after transient errors (workspace events). Chat streams should not replay a POST. */
  retry?: boolean;
}

class FatalStreamError extends Error {}

/**
 * Server-sent events with auth headers (03 §10.4). Parses JSON `data:`; heartbeats are comments
 * and never reach `onEvent`. Fatal errors (4xx) reject; transient ones retry when `retry` is set.
 */
export function openStream(opts: StreamOptions): Promise<void> {
  const url = opts.path.startsWith("http") ? opts.path : `${API_BASE}${opts.path}`;
  let backoff = 1000;
  return fetchEventSource(url, {
    method: opts.method ?? "GET",
    signal: opts.signal,
    openWhenHidden: opts.openWhenHidden ?? true,
    // Called before every (re)connect so a refreshed token is used.
    fetch: async (input, init) => {
      const token = await opts.getToken();
      const headers = new Headers(init?.headers);
      headers.set("X-Request-ID", newRequestId());
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (opts.body !== undefined) headers.set("Content-Type", "application/json");
      return fetch(input, {
        ...init,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
    },
    async onopen(res) {
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes(EventStreamContentType)) {
        backoff = 1000;
        opts.onOpen?.();
        return;
      }
      const err = await toApiError(res, res.headers.get("x-request-id") ?? "");
      if (err.code === "UNAUTHENTICATED") markSessionExpired();
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new FatalStreamError(err.message, { cause: err });
      throw err;
    },
    onmessage(msg) {
      if (!msg.data) return;
      let data: unknown = msg.data;
      try {
        data = JSON.parse(msg.data);
      } catch {
        /* plain-text payload */
      }
      opts.onEvent({ event: msg.event || "message", data, id: msg.id || undefined });
    },
    onclose() {
      // Long-lived streams reconnect when the server closes them; finite streams just end.
      if (opts.retry) throw new Error("Stream closed by server");
    },
    onerror(err) {
      if (err instanceof FatalStreamError) throw (err.cause as ApiError) ?? err;
      if (!opts.retry) throw err;
      opts.onRetry?.(err);
      backoff = Math.min(backoff * 2, 30_000);
      return backoff;
    },
  });
}
