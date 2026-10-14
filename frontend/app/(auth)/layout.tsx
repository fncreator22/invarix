import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Prewarm } from "@/components/marketing/prewarm";

/** 05 §14.3: centered card over a calm canvas, aurora glow in one corner, legal links below. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-aurora opacity-[var(--aurora-mesh-opacity)] blur-3xl"
      />
      <Prewarm />
      <Link href="/" aria-label="Reprieve home" className="relative mb-8 rounded-md">
        <Logo />
      </Link>
      <main id="main" className="relative flex w-full max-w-[400px] flex-1 flex-col items-center">
        {children}
      </main>
      <footer className="relative mt-8 flex gap-4 text-body-sm text-text-muted">
        <Link href="/terms" className="hover:text-text-primary">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-text-primary">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
