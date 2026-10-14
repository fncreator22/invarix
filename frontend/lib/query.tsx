"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { isApiError, NetworkError } from "@/lib/api";
import { errorBehavior, errorMessage } from "@/lib/errors";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean; success?: string };
  }
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // apiFetch already retries cold starts; only retry other transient failures once.
        retry: (count, err) => {
          if (err instanceof NetworkError) return count < 1;
          if (isApiError(err)) return err.status >= 500 && count < 1;
          return count < 1;
        },
      },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache({
      onSuccess: (_d, _v, _c, mutation) => {
        if (mutation.meta?.success) toast.success(mutation.meta.success);
      },
      onError: (err, _v, _c, mutation) => {
        if (mutation.meta?.silent) return;
        const behavior = errorBehavior(err);
        // These are handled by dedicated UI (session modal, form fields, conflict banner).
        if (behavior === "session-modal" || behavior === "field-errors" || behavior === "conflict-banner") return;
        toast.error(errorMessage(err), {
          description: isApiError(err) && err.requestId ? `Request ID ${err.requestId}` : undefined,
          duration: 6000,
        });
      },
    }),
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
