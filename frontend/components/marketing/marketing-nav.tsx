"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { useAuthBridge } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#developer-hub", label: "CLI & MCP" },
  { href: "/#case-studies", label: "Post-Mortems" },
  { href: "/rules", label: "Detection Rules" },
  { href: "/architecture", label: "Architecture" },
  { href: "/#faq", label: "FAQ" },
];

/** 05 §9: transparent over the hero, glass with blur on scroll, sheet menu on mobile. */
export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { enabled: authEnabled, isSignedIn } = useAuthBridge();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.08] bg-[#07080a]/95 backdrop-blur-xl shadow-lg shadow-black/50"
          : "border-b border-white/[0.04] bg-[#07080a]/40 backdrop-blur-sm",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1360px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="INVARIX home" className="rounded-md">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rounded-none px-3 py-2 text-body-sm font-medium text-text-secondary hover:text-text-primary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-command-menu"));
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
            className="flex items-center gap-2 rounded-none border border-white/[0.08] bg-[#121316] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/[0.2] hover:text-zinc-200"
          >
            <span>Ask Steward</span>
            <kbd className="inline-flex h-4 items-center justify-center rounded-none border border-white/[0.1] bg-black/40 px-1 font-mono text-[10px] text-zinc-400">
              ⌘K
            </kbd>
          </button>
          {authEnabled && isSignedIn ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/workspaces">Dashboard</Link>
              </Button>
              <div className="flex items-center pl-1">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "size-8 rounded-full ring-1 ring-white/20 hover:ring-brand",
                    },
                  }}
                />
              </div>
            </>
          ) : authEnabled ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex text-zinc-300 hover:text-white">
                <Link href="/w/northwind-pay/home">Live Sandbox (0 Login)</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/w/northwind-pay/home">Enter Demo</Link>
              </Button>
              <Button asChild>
                <Link href="/w/northwind-pay/home">Open Dashboard</Link>
              </Button>
            </>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto sm:hidden" aria-label="Open menu">
              <Menu aria-hidden className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <ul className="flex flex-col gap-1 px-4">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-md px-3 text-body font-medium text-text-primary hover:bg-brand-soft"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2 p-4">
              {authEnabled && isSignedIn ? (
                <>
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-body-sm text-text-muted">Account</span>
                    <UserButton />
                  </div>
                  <Button asChild size="lg">
                    <Link href="/workspaces" onClick={() => setOpen(false)}>
                      Open Dashboard
                    </Link>
                  </Button>
                </>
              ) : authEnabled ? (
                <>
                  <Button asChild size="lg">
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
                      Get started
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/sign-in" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/w/northwind-pay/home" onClick={() => setOpen(false)}>
                      Open Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/w/northwind-pay/home" onClick={() => setOpen(false)}>
                      Enter Demo
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
