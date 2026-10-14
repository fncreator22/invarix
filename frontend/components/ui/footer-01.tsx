"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* Layout primitive (Container), flattened from the shared `section` helper. */
const containerWidths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

interface ContainerProps extends React.ComponentProps<"div"> {
  width?: keyof typeof containerWidths;
}

function Container({ width = "default", className, ...props }: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn("mx-auto w-full px-6", containerWidths[width], className)}
      {...props}
    />
  );
}

/*
 * Brand icons for social links.
 * Clean, verified SVG vectors without extraneous bloat.
 */
type IconProps = React.ComponentProps<"svg">;

function BrandIcon({ d, ...props }: IconProps & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d={d} />
    </svg>
  );
}

function GitHubIcon(props: IconProps) {
  return (
    <BrandIcon
      d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"
      {...props}
    />
  );
}

function LinkedInIcon(props: IconProps) {
  return (
    <BrandIcon
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      {...props}
    />
  );
}

function XIcon(props: IconProps) {
  return (
    <BrandIcon
      d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z"
      {...props}
    />
  );
}

/* 
 * Steady, non-distracting live status indicator (anti-slop: zero pulsing green ping halos).
 */
function SteadyStatusDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex size-1.5 shrink-0 rounded-full bg-zinc-500", className)}
    />
  );
}

interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}

const columns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Detection Rules", href: "/rules" },
      { label: "Graph Explorer", href: "/w/northwind-pay/graph" },
      { label: "Architecture", href: "/architecture" },
      { label: "Incident Analyses", href: "/#case-studies" },
      { label: "Compound Telemetry", href: "/#telemetry-heading" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Zero-Login CLI", href: "https://github.com/fncreator22/Reprieve-full-stack", external: true },
      { label: "MCP Protocol", href: "/api/v1/workspaces/northwind-pay/mcp/tools", external: true },
      { label: "Pre-Merge CI Gate", href: "/#developer-hub" },
      { label: "Live Sandbox", href: "/w/northwind-pay/home" },
      { label: "API Keys", href: "/w/northwind-pay/settings?tab=api-keys" },
    ],
  },
  {
    title: "Governance",
    links: [
      { label: "8 Cypher Invariants", href: "/rules" },
      { label: "SOC2 Proof Export", href: "/w/northwind-pay/graph" },
      { label: "FalkorDB C-Engine", href: "/architecture" },
      { label: "Zero Model Training", href: "/privacy#model-training" },
    ],
  },
  {
    title: "Legal & Trust",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "GDPR Art. 6 Notice", href: "/privacy#lawful-basis" },
    ],
  },
];

const socials = [
  { name: "GitHub", href: "https://github.com/fncreator22/Reprieve-full-stack", icon: GitHubIcon },
  { name: "X", href: "https://x.com", icon: XIcon },
  { name: "LinkedIn", href: "https://linkedin.com", icon: LinkedInIcon },
];

export default function Footer01() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("Subscribed to Incident Post-Mortems", {
      description: `Updates and Cypher detection rules will be dispatched to ${email.trim()}.`,
    });
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-black text-white">
      <Container className="pt-16 sm:pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex max-w-sm flex-col gap-5">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold tracking-tight text-white hover:opacity-90 transition-opacity"
            >
              <Logo />
            </Link>
            <p className="text-body-sm text-zinc-400 leading-relaxed">
              The operational exception intelligence platform. Modeling temporary bypasses, skipped tests, and feature-flag overrides as promises in a living dependency graph.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-2 mt-1"
              onSubmit={handleSubscribe}
            >
              <label htmlFor="footer-01-email" className="sr-only">
                Email address
              </label>
              <Input
                id="footer-01-email"
                type="email"
                required
                suppressHydrationWarning
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                autoComplete="email"
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-brand"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Subscribe to Incident Post-Mortems"
                className="shrink-0 bg-brand text-black hover:bg-brand/90"
              >
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <p className="text-[12px] font-mono text-zinc-400">
              Zero marketing spam. Only Cypher detection rules &amp; incident post-mortems.
            </p>
          </div>

          <nav
            aria-label="Footer Navigation"
            className="grid grid-cols-2 gap-8 sm:grid-cols-4"
          >
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-mono uppercase tracking-[0.12em] text-zinc-300">
                  {column.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-body-sm text-zinc-400 transition-colors hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-body-sm text-zinc-400 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col-reverse items-start justify-between gap-6 border-t border-white/[0.08] py-8 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-3 text-xs text-zinc-400 sm:flex-row sm:items-center sm:gap-6 font-mono">
            <span>© {new Date().getFullYear()} Reprieve, Inc. All rights reserved.</span>
            <div className="inline-flex items-center gap-2 text-zinc-400">
              <SteadyStatusDot />
              <span>FalkorDB in-memory graph operational · 12ms</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {socials.map(({ name, href, icon: Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </Container>

      {/* Subtle, architectural brand typography without cheap gradient slop */}
      <div aria-hidden="true" className="pointer-events-none select-none pb-2 flex justify-center">
        <svg
          viewBox="0 0 1000 140"
          className="w-full max-w-5xl h-auto fill-white/[0.04]"
          aria-hidden="true"
        >
          <text
            x="50%"
            y="65%"
            dominantBaseline="middle"
            textAnchor="middle"
            className="font-mono font-bold tracking-tighter text-[120px]"
          >
            REPRIEVE
          </text>
        </svg>
      </div>
    </footer>
  );
}

export { Footer01 };
