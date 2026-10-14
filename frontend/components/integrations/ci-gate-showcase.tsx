"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  Copy, 
  ExternalLink, 
  GitCommit, 
  GitPullRequest, 
  Layers, 
  MessageSquare, 
  ShieldAlert, 
  Terminal 
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

interface CiGateShowcaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CiGateShowcase({ open, onOpenChange }: CiGateShowcaseProps) {
  const { slug } = useWorkspace();
  const [copied, setCopied] = useState(false);

  const copyYaml = () => {
    const yaml = `name: Reprieve Pre-Merge Gate
on:
  pull_request:
    branches: [main, master]

jobs:
  reprieve-audit:
    name: Evaluate Architectural Exception Debt
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run Reprieve AST Waiver Scan
        env:
          REPRIEVE_API_KEY: \${{ secrets.REPRIEVE_API_KEY }}
          REPRIEVE_WORKSPACE: \${{ secrets.REPRIEVE_WORKSPACE }}
        run: |
          python scripts/cli.py scan --dir . --submit

      - name: Enforce 30-Day Avalanche Circuit Breaker
        env:
          REPRIEVE_API_KEY: \${{ secrets.REPRIEVE_API_KEY }}
          REPRIEVE_WORKSPACE: \${{ secrets.REPRIEVE_WORKSPACE }}
        run: |
          python scripts/cli.py check --service payments_gateway --horizon 30 --fail-threshold 75.0`;

    void navigator.clipboard.writeText(yaml);
    setCopied(true);
    toast.success("Copied GitHub Actions workflow to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0 border-border-strong sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-surface-elevated border-b border-border-subtle p-5 sm:p-6">
          <div className="flex items-center gap-2 text-danger font-semibold text-caption mb-1">
            <ShieldAlert className="size-4" />
            <span>Developer Ergonomics · Zero-Login Automation</span>
          </div>
          <DialogTitle className="text-h3 font-display font-bold text-text-primary">
            GitHub Action Pre-Merge Risk Gate &amp; PR Bot
          </DialogTitle>
          <DialogDescription className="text-body-sm text-text-secondary mt-1">
            How Reprieve blocks dangerous waivers directly in GitHub pull requests before code merges to production.
          </DialogDescription>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-canvas">
          {/* Mock GitHub PR Comment */}
          <div className="rounded-xl border border-border-strong bg-surface overflow-hidden shadow-sm">
            {/* PR Header Bar */}
            <div className="bg-surface-subtle border-b border-border-subtle p-3.5 flex items-center justify-between text-body-sm">
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-4 text-brand" />
                <span className="font-semibold text-text-primary">PR #142:</span>
                <span className="text-text-secondary">chore(auth): bypass token verification on checkout during flash sale</span>
              </div>
              <span className="rounded-full bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 text-caption font-semibold">
                Checks Failed (1)
              </span>
            </div>

            {/* Reprieve Bot Comment Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-full bg-brand-soft border border-brand/30 flex items-center justify-center text-brand font-bold text-caption">
                    R
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary text-body-sm">reprieve-bot</span>
                    <span className="rounded bg-sunken px-1.5 py-0.2 text-[10px] text-text-muted ml-2 font-mono">bot</span>
                    <span className="text-caption text-text-muted ml-2">commented 2 minutes ago</span>
                  </div>
                </div>
                <div className="text-caption font-semibold text-danger flex items-center gap-1">
                  <AlertTriangle className="size-3.5" /> Circuit Breaker Triggered
                </div>
              </div>

              {/* Bot Markdown Body */}
              <div className="space-y-3 text-body-sm text-text-primary">
                <h4 className="text-body-base font-bold text-danger flex items-center gap-2">
                  <ShieldAlert className="size-4" />
                  Pre-Merge Risk Gate Blocked
                </h4>
                <p className="text-text-secondary leading-relaxed">
                  This pull request introduces a code waiver (<code className="bg-sunken px-1 py-0.5 rounded font-mono text-caption text-text-primary">#nosec</code> at line 84 in <code className="bg-sunken px-1 py-0.5 rounded font-mono text-caption text-text-primary">auth_client.py</code>) affecting critical tier service <strong className="text-text-primary font-semibold">payments-gateway</strong>.
                </p>

                {/* Risk Delta Table */}
                <div className="rounded-lg border border-border-subtle overflow-hidden">
                  <table className="w-full text-caption">
                    <thead className="bg-surface-subtle text-text-muted text-left">
                      <tr>
                        <th className="p-2 font-semibold">Metric</th>
                        <th className="p-2 font-semibold">Current Main</th>
                        <th className="p-2 font-semibold">With This PR</th>
                        <th className="p-2 font-semibold">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-mono text-body-sm">
                      <tr>
                        <td className="p-2 font-sans text-text-secondary">Avalanche Risk Centrality</td>
                        <td className="p-2 text-text-muted">0.12 (Low)</td>
                        <td className="p-2 text-danger font-bold">0.84 (Critical)</td>
                        <td className="p-2 text-danger font-semibold">+0.72</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans text-text-secondary">Downstream Services at Risk</td>
                        <td className="p-2 text-text-muted">0</td>
                        <td className="p-2 text-warning font-bold">4 services</td>
                        <td className="p-2 text-warning">+4 exposed</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-sans text-text-secondary">Est. Downtime Revenue Exposure</td>
                        <td className="p-2 text-text-muted">$0 / hr</td>
                        <td className="p-2 text-danger font-bold">$340,000 / hr</td>
                        <td className="p-2 text-danger">Black Friday Risk</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Failure Path */}
                <div className="rounded-lg bg-surface-subtle p-3 border border-border-subtle space-y-1">
                  <div className="text-caption font-semibold text-text-primary flex items-center gap-1.5">
                    <Layers className="size-3.5 text-danger" />
                    Cascading Multi-Hop Failure Path:
                  </div>
                  <div className="font-mono text-caption text-text-secondary flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-text-primary">payments-gateway</span>
                    <ArrowRight className="size-3 text-text-muted" />
                    <span className="text-danger">auth_cache (bypass)</span>
                    <ArrowRight className="size-3 text-text-muted" />
                    <span className="font-semibold text-text-primary">checkout-api</span>
                    <ArrowRight className="size-3 text-text-muted" />
                    <span className="text-danger font-semibold">billing_service (outage)</span>
                  </div>
                </div>

                <div className="text-caption text-text-muted italic">
                  To approve this waiver, link a Compensating Control or assign an active owner in Reprieve.
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Action Workflow Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-body-sm text-text-primary flex items-center gap-2">
                <GitCommit className="size-4 text-brand" />
                Add to your repository: .github/workflows/reprieve-gate.yml
              </h4>
              <Button size="sm" variant="outline" onClick={copyYaml} className="gap-1.5">
                {copied ? <Check className="size-3 text-brand" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy Workflow"}
              </Button>
            </div>

            <div className="rounded-lg bg-sunken p-4 font-mono text-caption text-text-secondary border border-border-subtle overflow-x-auto">
              <pre className="text-[11px] leading-relaxed">
{`name: Reprieve Pre-Merge Gate
on: [pull_request]
jobs:
  reprieve-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Reprieve AST Scan & Risk Check
        env:
          REPRIEVE_API_KEY: \${{ secrets.REPRIEVE_API_KEY }}
          REPRIEVE_WORKSPACE: \${{ secrets.REPRIEVE_WORKSPACE }}
        run: |
          python scripts/cli.py scan --dir . --submit
          python scripts/cli.py check --service payments_gateway --fail-threshold 75.0`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface-elevated border-t border-border-subtle p-4 flex items-center justify-between">
          <span className="text-caption text-text-muted">
            CLI &amp; CI/CD Bridge Powered by Reprieve Engine
          </span>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
