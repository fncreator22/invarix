"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

/** Lenis smooth scrolling for marketing pages only (never inside app scroll containers). Off under reduced motion. */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true });
    return () => lenis.destroy();
  }, [reduced]);
  return null;
}
