"use client";

import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { useAuthBridge } from "@/lib/auth";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#developer-hub", label: "CLI & MCP" },
  { href: "/#case-studies", label: "Post-Mortems" },
  { href: "/#demo", label: "Live Demo" },
  { href: "/rules", label: "Detection Rules" },
  { href: "/architecture", label: "Architecture" },
  { href: "/#faq", label: "FAQ" },
];

/** 05 §9: transparent over the hero, glass with blur on scroll, sheet menu on mobile. */
export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [inDemoSection, setInDemoSection] = useState(false);
  const { enabled: authEnabled, isSignedIn, user, signOut } = useAuthBridge();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const isStewardApplicable = isSignedIn || inDemoSection;

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
          {isStewardApplicable && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-command-menu"));
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
              }}
              className="flex items-center gap-2 rounded-none border border-white/[0.08] bg-[#121316] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/[0.2] hover:text-zinc-200 animate-in fade-in duration-200"
            >
              <Sparkles className="size-3.5 text-brand" />
              <span>Ask Steward</span>
              <kbd className="inline-flex h-4 items-center justify-center rounded-none border border-white/[0.1] bg-black/40 px-1 font-mono text-[10px] text-zinc-400">
                ⌘K
              </kbd>
            </button>
          )}
          {isSignedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/workspaces">Workspaces</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/w/northwind-pay/home">Dashboard</Link>
              </Button>
              {CLERK_ENABLED ? (
                <div className="flex items-center pl-1">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "size-8 rounded-full ring-1 ring-white/20 hover:ring-brand",
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-1">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-soft border border-brand/30 text-xs font-bold text-brand">
                    {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="text-caption text-zinc-400 hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02]">
                <Link href="/w/northwind-pay/home">Live Sandbox (0 Login)</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-zinc-200 hover:text-white">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#5848e5] hover:bg-[#4d3ed0] text-white font-semibold shadow-md shadow-[#5848e5]/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Link href="/sign-up">Get started</Link>
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
              {isStewardApplicable && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent("open-command-menu"));
                  }}
                  className="flex items-center justify-between rounded-md border border-white/[0.12] bg-[#121316] px-3.5 py-2.5 text-body-sm text-zinc-200 transition-colors hover:border-brand/40 hover:text-white mb-1"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-4 text-brand" />
                    Ask Steward
                  </span>
                  <kbd className="font-mono text-caption text-zinc-400">⌘K</kbd>
                </button>
              )}
              {isSignedIn ? (
                <>
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-body-sm text-text-muted">
                      {user ? user.email : "Signed In"}
                    </span>
                    {CLERK_ENABLED ? (
                      <UserButton />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          signOut();
                        }}
                        className="text-caption text-zinc-400 hover:text-white"
                      >
                        Sign out
                      </button>
                    )}
                  </div>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/workspaces" onClick={() => setOpen(false)}>
                      Workspaces
                    </Link>
                  </Button>
                  <Button asChild size="lg">
                    <Link href="/w/northwind-pay/home" onClick={() => setOpen(false)}>
                      Open Dashboard
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-brand-solid hover:bg-brand-solid/90 text-white font-semibold shadow-md shadow-brand-solid/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
                      Get started
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/sign-in" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="text-zinc-300">
                    <Link href="/w/northwind-pay/home" onClick={() => setOpen(false)}>
                      Live Sandbox (0 Login)
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
