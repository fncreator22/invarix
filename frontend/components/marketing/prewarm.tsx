"use client";

import { useEffect } from "react";
import { prewarmApi } from "@/lib/api";

/** Wake the API (Render free tier) on the visitor's first interaction (04 §4.1, FR-MKT-05). */
export function Prewarm() {
  useEffect(() => {
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    const fire = () => {
      prewarmApi();
      events.forEach((e) => window.removeEventListener(e, fire));
    };
    events.forEach((e) => window.addEventListener(e, fire, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, fire));
  }, []);
  return null;
}
