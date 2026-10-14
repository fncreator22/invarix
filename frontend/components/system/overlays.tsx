"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogoMark } from "@/components/logo";
import { clearSessionExpired, useApiStatus } from "@/lib/api";
import { useOnline } from "@/lib/hooks";

/** SCR-X-07: persistent until the connection returns. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-body-sm text-warning">
      <WifiOff aria-hidden className="size-4" />
      You&apos;re offline. Changes can&apos;t be saved. We&apos;ll reconnect automatically.
    </div>
  );
}

/**
 * SCR-X-03 (FLOW-14): any 401 opens this non-destructive modal. Form state stays in memory;
 * signing in returns to the same URL.
 */
export function SessionExpiredModal() {
  const { sessionExpired } = useApiStatus();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const qs = params.toString();
  const back = `${pathname}${qs ? `?${qs}` : ""}`;
  return (
    <AlertDialog open={sessionExpired}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Signed out for safety</AlertDialogTitle>
          <AlertDialogDescription>
            Your session ended. Sign in again to pick up where you left off. Nothing you were working on is sent until
            you do.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              clearSessionExpired();
              router.push(`/sign-in?redirect_url=${encodeURIComponent(back)}`);
            }}
          >
            Sign in again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** 04 §4.1 / 05 §14.1 cold-start card: shown while apiFetch retries a sleeping API. */
export function ColdStartCard() {
  const { waking } = useApiStatus();
  if (!waking) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--topbar-h)+24px)] z-(--z-popover) flex justify-center px-4">
      <div role="status" aria-live="polite" className="glass pointer-events-auto flex max-w-md items-center gap-4 rounded-lg border border-border-subtle p-4 shadow-e3">
        <span aria-hidden className="relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft">
          <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--proof)_60deg,transparent_120deg)] opacity-60 motion-safe:animate-radar" />
          <LogoMark className="relative size-6" />
        </span>
        <div className="text-body-sm">
          <p className="font-medium text-text-primary">Waking the server. First load can take up to a minute.</p>
          <p className="text-text-muted">Retrying automatically.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Branded splash (05 §14.1) shown only if hydration takes longer than 400 ms: it is server-rendered
 * invisible, fades in after a 400 ms CSS delay, and is removed as soon as React hydrates.
 */
export function HydrationSplash() {
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the effect running is the hydration signal
  useEffect(() => setHydrated(true), []);
  if (hydrated) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-(--z-splash) flex flex-col items-center justify-center bg-canvas opacity-0 [animation:fade-up_320ms_var(--ease-out)_400ms_forwards]"
    >
      <div className="aurora-mesh absolute inset-0" />
      <LogoMark className="relative size-14" />
      <div className="relative mt-6 h-0.5 w-32 overflow-hidden rounded-full bg-border-subtle">
        <div className="h-full w-1/2 bg-aurora motion-safe:animate-[aurora-drift_1.2s_ease-in-out_infinite_alternate]" />
      </div>
      <p className="relative mt-4 text-body-sm text-text-secondary">Warming up your workspace</p>
    </div>
  );
}
