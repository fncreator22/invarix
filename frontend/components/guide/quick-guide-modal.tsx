"use client";

import { useState } from "react";
import { 
  AlertOctagon, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Copy, 
  Database, 
  ExternalLink, 
  GitPullRequest, 
  Layers, 
  Network, 
  ShieldCheck, 
  Sparkles, 
  Terminal, 
  Users, 
  Zap 
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

interface QuickGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickGuideModal({ open, onOpenChange }: QuickGuideModalProps) {
  const { slug } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"concept" | "risks" | "cli" | "pr">("concept");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0 border-border-strong sm:max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="bg-surface-elevated border-b border-border-subtle p-4 sm:p-5">
          <div className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-subtle px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-text-secondary mb-2">
            <span>Architecture Walkthrough · Fundamentals</span>
          </div>
          <DialogTitle className="text-h3 font-display font-bold text-text-primary">
            Understanding Exception Debt &amp; Graph Governance
          </DialogTitle>
          <DialogDescription className="text-body-sm text-text-secondary mt-1">
            Why isolated tickets in Jira fail at systemic risk, and how Reprieve models your architecture in a living knowledge graph.
          </DialogDescription>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1 mt-4 border-b border-border-subtle pb-1 -mb-1">
            <button
              type="button"
              onClick={() => setActiveTab("concept")}
              className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors ${
                activeTab === "concept"
                  ? "bg-brand text-text-on-brand shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              }`}
            >
              1. The Core Concept
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("risks")}
              className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors ${
                activeTab === "risks"
                  ? "bg-brand text-text-on-brand shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              }`}
            >
              2. The 3 Failure Modes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cli")}
              className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors ${
                activeTab === "cli"
                  ? "bg-brand text-text-on-brand shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              }`}
            >
              3. Terminal &amp; Ingestion
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pr")}
              className={`px-3 py-1.5 rounded-md text-caption font-medium transition-colors ${
                activeTab === "pr"
                  ? "bg-brand text-text-on-brand shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              }`}
            >
              4. Pre-Merge PR Gate
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === "concept" && (
            <div className="space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Traditional Ticketing */}
                <div className="rounded-xl border border-border-subtle bg-surface-subtle p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-text-muted font-semibold text-caption">
                    <span className="size-2 rounded-full bg-text-muted" />
                    TRADITIONAL ITSM (Jira / ServiceNow)
                  </div>
                  <h4 className="font-semibold text-body-base text-text-primary">Isolated Flat Records</h4>
                  <ul className="space-y-2 text-caption text-text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="text-danger font-bold">✕</span>
                      <span>Waivers stored as closed tickets or buried Confluence tables.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-danger font-bold">✕</span>
                      <span>No awareness of microservice call graphs or dependencies.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-danger font-bold">✕</span>
                      <span>Cannot detect when an owner leaves the company.</span>
                    </li>
                  </ul>
                </div>

                {/* Reprieve Graph Engine */}
                <div className="rounded-xl border border-brand/40 bg-brand-soft/20 p-3.5 space-y-2.5 dark:bg-brand-soft/10">
                  <div className="flex items-center gap-2 text-brand font-semibold text-caption">
                    <Zap className="size-3.5 fill-current" />
                    REPRIEVE KNOWLEDGE GRAPH
                  </div>
                  <h4 className="font-semibold text-body-base text-text-primary">Living Directed Graph</h4>
                  <ul className="space-y-2 text-caption text-text-secondary">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                      <span>Every shortcut is an active promise with a live expiration countdown.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                      <span>Traces multi-hop cascading blast radius across your architecture.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                      <span>Calculates mathematical avalanche reachability (P = p₀ʰ).</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl bg-surface border border-border-subtle p-3.5 shadow-xs">
                <h5 className="font-semibold text-body-sm text-text-primary mb-1">
                  The Definition of Exception Debt:
                </h5>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  A software exception is a temporary promise to accept risk in exchange for delivery speed. 
                  When that promise expires without compensating controls or architectural review, it transforms into an invisible structural vulnerability across dependencies.
                </p>
              </div>
            </div>
          )}

          {activeTab === "risks" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-subtle bg-surface p-4 flex gap-4 items-start">
                <div className="rounded-lg bg-danger/10 p-2.5 text-danger shrink-0">
                  <Users className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-body-base text-text-primary">1. Orphaned Waivers</h4>
                  <p className="text-body-sm text-text-secondary">
                    A staff engineer granted an emergency bypass 9 months ago, then departed for another company. 
                    The code waiver remains active in production with zero accountability. Reprieve cross-references HR graph nodes to identify orphans immediately.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface p-4 flex gap-4 items-start">
                <div className="rounded-lg bg-warning/10 p-2.5 text-warning shrink-0">
                  <Layers className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-body-base text-text-primary">2. Temporal Expiry Collisions</h4>
                  <p className="text-body-sm text-text-secondary">
                    Three different teams take isolated temporary shortcuts expiring in the same 72-hour window (e.g. Cyber Monday). 
                    Individually each is survivable; together they create simultaneous cascading outages.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface p-4 flex gap-4 items-start">
                <div className="rounded-lg bg-info/10 p-2.5 text-info shrink-0">
                  <Network className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-body-base text-text-primary">3. Avalanche Reachability</h4>
                  <p className="text-body-sm text-text-secondary">
                    A failure in an obscure internal service propagates downstream to authentication, payments, and checkout. 
                    Reprieve computes exact shortest proof paths to isolate root causes in seconds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cli" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-semibold text-body-base text-text-primary flex items-center gap-2">
                  <Terminal className="size-4 text-brand" />
                  Zero-Login Autonomous Ingestion
                </h4>
                <p className="text-body-sm text-text-secondary">
                  Developers never have to open the web dashboard to enter waivers. Run our CLI or hook into your git commits:
                </p>
              </div>

              <div className="rounded-lg bg-sunken p-4 font-mono text-caption text-text-primary space-y-2 border border-border-subtle">
                <div className="flex items-center justify-between text-text-muted pb-1 border-b border-border-subtle">
                  <span>TERMINAL · LOCAL OR CI</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `export REPRIEVE_WORKSPACE="${slug}"\nexport REPRIEVE_API_KEY="<your-api-key>"\npython scripts/cli.py scan --submit`,
                        "CLI Scan Script"
                      )
                    }
                    className="flex items-center gap-1 text-brand hover:underline font-sans text-caption"
                  >
                    {copiedCmd === "CLI Scan Script" ? <Check className="size-3" /> : <Copy className="size-3" />}
                    Copy script
                  </button>
                </div>
                <p className="text-text-muted"># 1. Point to your workspace</p>
                <p className="text-brand">export REPRIEVE_WORKSPACE=&quot;{slug}&quot;</p>
                <p className="text-brand">export REPRIEVE_API_KEY=&quot;&lt;your-key-from-settings&gt;&quot;</p>
                <p className="text-text-muted pt-2"># 2. Automatically scan repository for #nosec, @skip, and TODOs</p>
                <p className="text-text-primary">python scripts/cli.py scan --dir . --submit</p>
              </div>

              <div className="rounded-lg bg-surface-subtle p-3.5 text-caption text-text-secondary border border-border-subtle flex items-center justify-between">
                <span>Need to generate an API key?</span>
                <Button size="sm" variant="outline" asChild>
                  <a href={`/w/${slug}/settings/api-keys`}>Go to API Keys &rarr;</a>
                </Button>
              </div>
            </div>
          )}

          {activeTab === "pr" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-semibold text-body-base text-text-primary flex items-center gap-2">
                  <GitPullRequest className="size-4 text-brand" />
                  GitHub PR Pre-Merge Circuit Breaker
                </h4>
                <p className="text-body-sm text-text-secondary">
                  Catch high-risk waivers in developer pull requests before they merge into production:
                </p>
              </div>

              <div className="rounded-xl border border-border-strong bg-surface p-4 space-y-3 font-mono text-caption">
                <div className="flex items-center justify-between text-text-muted border-b border-border-subtle pb-2">
                  <span className="flex items-center gap-2 text-text-primary font-sans font-semibold">
                    <span className="size-2 rounded-full bg-danger" />
                    GitHub Actions · .github/workflows/reprieve-gate.yml
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `name: Reprieve Pre-Merge Gate
on: [pull_request]
jobs:
  reprieve-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Reprieve Risk Gate
        env:
          REPRIEVE_API_KEY: \${{ secrets.REPRIEVE_API_KEY }}
          REPRIEVE_WORKSPACE: \${{ secrets.REPRIEVE_WORKSPACE }}
        run: |
          python scripts/cli.py scan --submit
          python scripts/cli.py check --service payments_gateway --fail-threshold 75.0`,
                        "GitHub Action Workflow"
                      )
                    }
                    className="flex items-center gap-1 text-brand hover:underline font-sans text-caption"
                  >
                    {copiedCmd === "GitHub Action Workflow" ? <Check className="size-3" /> : <Copy className="size-3" />}
                    Copy YAML
                  </button>
                </div>
                <pre className="text-text-secondary overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
{`name: Reprieve Pre-Merge Gate
on: [pull_request]
jobs:
  reprieve-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Reprieve Risk Gate
        env:
          REPRIEVE_API_KEY: \${{ secrets.REPRIEVE_API_KEY }}
          REPRIEVE_WORKSPACE: \${{ secrets.REPRIEVE_WORKSPACE }}
        run: |
          python scripts/cli.py scan --submit
          python scripts/cli.py check --fail-threshold 75.0`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-elevated border-t border-border-subtle p-4 flex items-center justify-between">
          <div className="text-caption text-text-muted">
            Track 01 · Track 02 · Track 03 Ready
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Got it, Let&apos;s Explore
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
