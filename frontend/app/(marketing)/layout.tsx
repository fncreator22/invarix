import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Prewarm } from "@/components/marketing/prewarm";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { CommandMenuListener } from "@/components/marketing/command-menu-listener";

import { AmbientBackground } from "@/components/marketing/ambient-background";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative min-h-screen bg-[#07080a] text-[#f7f8f8] selection:bg-brand selection:text-white">
      {/* Living Technical Blueprint & Ambient Mesh Background */}
      <AmbientBackground />

      <a
        href="#main"
        className="sr-only z-(--z-splash) rounded-md bg-brand-solid px-4 py-2 text-text-on-brand focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Prewarm />
      <SmoothScroll />
      <CommandMenuListener />
      <MarketingNav />
      <main id="main" className="relative z-10 overflow-x-clip">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
