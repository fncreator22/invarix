"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface ShellState {
  railCollapsed: boolean;
  toggleRail: () => void;
  stewardOpen: boolean;
  setStewardOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellState | null>(null);
const RAIL_KEY = "reprieve:rail-collapsed";

export function ShellProvider({ children }: { children: ReactNode }) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [stewardOpen, setStewardOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-user preference after hydration
      setRailCollapsed(localStorage.getItem(RAIL_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleRail = useCallback(() => {
    setRailCollapsed((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !v;
    });
  }, []);

  // ⌘K / Ctrl+K opens the palette from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ railCollapsed, toggleRail, stewardOpen, setStewardOpen, commandOpen, setCommandOpen }),
    [railCollapsed, toggleRail, stewardOpen, commandOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const v = useContext(ShellContext);
  if (!v) throw new Error("useShell must be used inside ShellProvider");
  return v;
}
