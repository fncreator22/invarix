"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

let lastTrigger: HTMLElement | null = null;
/** Element that opened the drawer, so focus can return to it on close (04 §8). */
export const takeDrawerTrigger = () => {
  const el = lastTrigger;
  lastTrigger = null;
  return el;
};

/** Entity drawer state lives in the URL: `?drawer=<id>`. */
export function useEntityDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const id = params.get("drawer");

  const open = useCallback(
    (entityId: string) => {
      if (typeof document !== "undefined") lastTrigger = document.activeElement as HTMLElement | null;
      const next = new URLSearchParams(params.toString());
      next.set("drawer", entityId);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("drawer");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return { id, open, close };
}
