"use client";

import { Keycap } from "@/components/marketing/keycap";

export function CommandMenuTriggerButton() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-command-menu"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.1] bg-[#121316] px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-white/[0.2] hover:bg-[#18191d]"
    >
      <span>Command Menu</span>
      <Keycap keys={["⌘K"]} />
    </button>
  );
}
