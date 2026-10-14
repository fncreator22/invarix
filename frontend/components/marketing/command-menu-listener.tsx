"use client";

import { useEffect, useState } from "react";
import { CommandMenuModal } from "@/components/marketing/command-menu-modal";

/**
 * Global client listener for the Cmd+K Command Menu.
 * Listens for standard shortcut or custom 'open-command-menu' events.
 */
export function CommandMenuListener() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleCustom = () => setOpen(true);
    window.addEventListener("open-command-menu", handleCustom);
    return () => window.removeEventListener("open-command-menu", handleCustom);
  }, []);

  return <CommandMenuModal open={open} onOpenChange={setOpen} />;
}
