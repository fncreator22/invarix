"use client";

import React, { useState } from "react";
import { Terminal, Cpu, GitPullRequest, Copy, Check, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const GITHUB_ACTION_YAML = `name: Reprieve Architecture Gate
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AST Code Waiver Scan
        run: npx reprieve scan --strict --submit
      - name: Enforce Avalanche Gate
        run: npx reprieve check --horizon 30 --fail-threshold 75.0`;

function FalkorDbLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="FalkorDB">
      <defs>
        <linearGradient id="falkor-grad-bento" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF385C" />
          <stop offset="1" stopColor="#FF7A00" />
        </linearGradient>
      </defs>
      <path
        d="M6 9L16 4L26 9V19L21 27L16 29L11 27L6 19V9Z"
        stroke="url(#falkor-grad-bento)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="url(#falkor-grad-bento)"
        fillOpacity="0.14"
      />
      <circle cx="16" cy="16" r="2.5" fill="#FF7A00" />
      <circle cx="16" cy="4" r="1.5" fill="#FF385C" />
      <circle cx="6" cy="9" r="1.5" fill="#FF385C" />
      <circle cx="26" cy="9" r="1.5" fill="#FF7A00" />
    </svg>
  );
}

function RedisLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-label="Redis">
      <path d="M16 2L29 7.8L16 13.6L3 7.8L16 2Z" fill="#DC382D" />
      <path d="M3 10.5L16 16.3V22.1L3 16.3V10.5Z" fill="#A3241B" />
      <path d="M29 10.5L16 16.3V22.1L29 16.3V10.5Z" fill="#B8271D" />
    </svg>
  );
}

function GitHubActionsLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="GitHub Actions">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function FastApiLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="FastAPI">
      <circle cx="12" cy="12" r="10" fill="#05998B" />
      <path d="M12.5 5.5L7 13.5H12L11.5 18.5L17 10.5H12L12.5 5.5Z" fill="white" />
    </svg>
  );
}

function NextJsLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Next.js">
      <circle cx="12" cy="12" r="10" fill="#000" stroke="#444" strokeWidth="1.2" />
      <path d="M15.5 8.5V15.5M8.5 8.5V15.5M8.5 8.5L15.5 15.5" stroke="white" strokeWidth="1.2" />
    </svg>
  );
}

function ClerkLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Clerk">
      <rect width="24" height="24" rx="6" fill="#6C47FF" />
      <path d="M7 12a5 5 0 0 1 10 0v1a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1z" fill="white" opacity="0.9" />
    </svg>
  );
}

export function FeaturesCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="developer-hub"
      aria-labelledby="features-heading"
      className="mx-auto max-w-[1280px] px-6 pt-12 pb-20 sm:px-10 sm:pt-16 sm:pb-32"
    >
      {/* Section Header */}
      <div className="max-w-3xl space-y-4 mb-14 text-left">
        <span className="text-[12px] font-mono uppercase tracking-[0.1em] text-zinc-400 font-semibold">
          HOW IT WORKS
        </span>
        <h2 id="features-heading" className="text-[2.25rem] sm:text-[2.75rem] font-display font-bold text-white tracking-tight leading-[1.15]">
          Three Native Interfaces. Zero Friction.
        </h2>
        <p className="text-[1.125rem] text-zinc-300 leading-relaxed">
          Developers don&apos;t want another dashboard. Reprieve comments directly on pull requests, exposes 14 graph reasoning tools to Cursor and Claude Desktop via MCP, and runs in 12ms inside your CI pipeline with zero login.
        </p>
      </div>

      {/* Unified Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Tile 1: CLI Scanner (4 cols) */}
        <div className="md:col-span-4 rounded-none border border-white/[0.08] bg-[#0c0d12] p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-none border border-white/10 bg-white/[0.04] text-brand">
                <Terminal className="size-4.5" aria-hidden="true" />
              </span>
              <span className="rounded-none border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-300">
                Zero-Login
              </span>
            </div>
            <h3 className="font-display text-[1.25rem] font-bold text-white">CLI Scanner</h3>
            <p className="text-[14px] text-zinc-300 leading-relaxed">
              Local AST code parser mining <code className="text-zinc-200 bg-white/10 px-1 py-0.5 rounded-none font-mono text-[12px]">#nosec</code>, <code className="text-zinc-200 bg-white/10 px-1 py-0.5 rounded-none font-mono text-[12px]">@skip</code>, and temporary flags. Evaluates multi-hop cascades before push.
            </p>
          </div>

          <div className="rounded-none border border-white/[0.08] bg-[#07080a] p-3 font-mono text-[12px] flex items-center justify-between">
            <span className="text-zinc-300 truncate">npx reprieve scan --strict</span>
            <button
              type="button"
              onClick={() => handleCopy("npx reprieve scan --strict")}
              aria-label="Copy CLI command"
              className="ml-2 p-1.5 rounded-none hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <Copy className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tile 2: MCP Protocol (4 cols) */}
        <div className="md:col-span-4 rounded-none border border-white/[0.08] bg-[#0c0d12] p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-none border border-white/10 bg-white/[0.04] text-brand">
                <Cpu className="size-4.5" aria-hidden="true" />
              </span>
              <span className="rounded-none border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand">
                14 Tools
              </span>
            </div>
            <h3 className="font-display text-[1.25rem] font-bold text-white">MCP Protocol</h3>
            <p className="text-[14px] text-zinc-300 leading-relaxed">
              Model Context Protocol endpoint for Cursor and Claude Desktop. Read-only graph reasoning tools with deterministic grounding: uncited entity IDs are stripped automatically.
            </p>
          </div>

          <div className="rounded-none border border-white/[0.08] bg-[#07080a] p-3 font-mono text-[11px] text-zinc-400">
            <span className="text-brand font-semibold">Endpoint:</span> /api/v1/workspaces/&#123;id&#125;/mcp/tools
          </div>
        </div>

        {/* Tile 3: GitHub CI Gate + Truncated YAML (4 cols) */}
        <div className="md:col-span-4 rounded-none border border-white/[0.08] bg-[#0c0d12] p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-none border border-white/10 bg-white/[0.04] text-brand">
                <GitPullRequest className="size-4.5" aria-hidden="true" />
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(GITHUB_ACTION_YAML)}
                aria-label="Copy GitHub Action YAML snippet"
                className="h-7 rounded-none border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white font-mono text-[11px] px-2.5"
              >
                {copied ? <Check className="mr-1 size-3 text-emerald-400" /> : <Copy className="mr-1 size-3" />}
                <span>{copied ? "Copied" : "Copy YAML"}</span>
              </Button>
            </div>
            <h3 className="font-display text-[1.25rem] font-bold text-white">GitHub CI Gate</h3>
          </div>

          <pre
            tabIndex={0}
            className="rounded-none border border-white/[0.08] bg-[#07080a] p-3.5 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-x-auto max-h-[140px] focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <code>{GITHUB_ACTION_YAML}</code>
          </pre>
        </div>

        {/* Row 2: Telemetry Stats (2 Compact Tiles, 6 cols total) */}
        <div className="md:col-span-3 rounded-none border border-white/[0.08] bg-[#0c0d12] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-1">
            <span className="rounded-none border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
              SIMULATED BENCHMARK
            </span>
            <div className="mt-2 font-mono text-[2rem] font-bold text-white leading-none">0.00%</div>
            <p className="text-[13px] font-medium text-zinc-200">False Positive Rate</p>
          </div>
          <p className="font-mono text-[11px] text-zinc-400 mt-2">
            Tested across 10,000 simulated microservice graphs under sliding expiry windows.
          </p>
        </div>

        <div className="md:col-span-3 rounded-none border border-white/[0.08] bg-[#0c0d12] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-1">
            <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              DETERMINISTIC LATENCY
            </span>
            <div className="mt-2 font-mono text-[2rem] font-bold text-white leading-none">12ms</div>
            <p className="text-[13px] font-medium text-zinc-200">Pre-Merge Gate Latency</p>
          </div>
          <p className="font-mono text-[11px] text-zinc-400 mt-2">
            In-memory FalkorDB Cypher traversal halts cascading releases before merge.
          </p>
        </div>

        {/* Row 2 Right: Stack Integrations Plain Logo Row (6 cols) */}
        <div className="md:col-span-6 rounded-none border border-white/[0.08] bg-[#0c0d12] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Ecosystem Connectors
            </span>
            <h4 className="text-[1rem] font-bold text-white">Built for Living Engineering Stacks</h4>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-3">
            {[
              { name: "FalkorDB", role: "Graph Engine", logo: FalkorDbLogo },
              { name: "Redis", role: "Cache Layer", logo: RedisLogo },
              { name: "GitHub", role: "CI/CD Gate", logo: GitHubActionsLogo },
              { name: "FastAPI", role: "Async Engine", logo: FastApiLogo },
              { name: "Next.js", role: "Web Engine", logo: NextJsLogo },
              { name: "Clerk", role: "Session Auth", logo: ClerkLogo },
            ].map((item) => {
              const Logo = item.logo;
              return (
                <div
                  key={item.name}
                  className="flex flex-col items-center justify-center p-2 rounded-none bg-white/[0.02] border border-white/[0.04] text-center"
                >
                  <Logo className="size-5" />
                  <span className="mt-1 font-mono text-[10px] font-semibold text-zinc-300">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export const Component = FeaturesCard;
export default FeaturesCard;
