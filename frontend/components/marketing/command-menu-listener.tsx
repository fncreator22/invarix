"use client";

import { useEffect, useState } from "react";
import { CommandMenuModal } from "@/components/marketing/command-menu-modal";
import { useAuthBridge } from "@/lib/auth";

/**
 * Global client listener for the Cmd+K Command Menu.
 * Applicable when the user is signed in OR currently in the interactive demo section.
 */
export function CommandMenuListener() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuthBridge();
  const [inDemoSection, setInDemoSection] = useState(false);

  useEffect(() => {
    const checkDemo = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#demo") {
        setInDemoSection(true);
        return;
      }
      const el = document.getElementById("demo");
      if (!el) {
        setInDemoSection(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
      setInDemoSection(inView);
    };

    checkDemo();
    window.addEventListener("scroll", checkDemo, { passive: true });
    window.addEventListener("hashchange", checkDemo);
    return () => {
      window.removeEventListener("scroll", checkDemo);
      window.removeEventListener("hashchange", checkDemo);
    };
  }, []);

  const isApplicable = isSignedIn || inDemoSection;

  useEffect(() => {
    const handleCustom = () => setOpen(true);
    window.addEventListener("open-command-menu", handleCustom);
    return () => window.removeEventListener("open-command-menu", handleCustom);
  }, []);

  useEffect(() => {
    if (!isApplicable) return;
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [isApplicable]);

  if (!isApplicable && !open) return null;

  return <CommandMenuModal open={open} onOpenChange={setOpen} />;
}

