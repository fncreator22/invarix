"use client";

import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StewardChat } from "@/components/steward/steward-chat";
import { useShell } from "@/components/shell/shell-context";
import { useMediaQuery } from "@/lib/hooks";

/** Steward panel body: the shared conversation (SCR-P-13). */
export function StewardPanelBody() {
  return <StewardChat compact />;
}

/**
 * Steward side-panel frame (05 §6.1): 400 px column that pushes content at ≥1024 px,
 * an overlay sheet below that, full screen on mobile.
 */
export function StewardPanel() {
  const { stewardOpen, setStewardOpen } = useShell();
  const desktop = useMediaQuery("(min-width: 1024px)");

  if (desktop) {
    if (!stewardOpen) return null;
    return (
      <aside
        aria-label="Steward"
        className="sticky top-0 flex h-dvh w-(--steward-w) shrink-0 flex-col border-l border-border-subtle bg-surface"
      >
        <div className="flex h-(--topbar-h) items-center justify-between border-b border-border-subtle px-4">
          <h2 className="flex items-center gap-2 font-sans text-body font-semibold">
            <Sparkles aria-hidden className="size-4 text-brand" />
            Steward
          </h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close Steward" onClick={() => setStewardOpen(false)}>
            <X aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <StewardPanelBody />
        </div>
      </aside>
    );
  }

  return (
    <Sheet open={stewardOpen} onOpenChange={setStewardOpen}>
      <SheetContent side="right" className="sm:max-w-(--steward-w)">
        <SheetHeader className="border-b border-border-subtle">
          <SheetTitle className="flex items-center gap-2 font-sans text-body font-semibold">
            <Sparkles aria-hidden className="size-4 text-brand" />
            Steward
          </SheetTitle>
          <SheetDescription className="sr-only">Ask the Steward about this workspace</SheetDescription>
        </SheetHeader>
        <StewardPanelBody />
      </SheetContent>
    </Sheet>
  );
}
