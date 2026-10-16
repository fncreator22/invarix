import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Database, Lock, Network, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { CLERK_ENABLED } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "Architecture & 3-Graph Topology · INVARIX",
  description: "Technical deep dive on INVARIX's multi-graph FalkorDB foundation, the Sentinel detection engine, and the Steward AI memory model.",
};

export default function ArchitecturePage() {
  return (
    <div className="relative pt-24 pb-20">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[450px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(34,211,238,0.12),transparent)]" />

      <main className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Header */}
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-300">
              <Database className="size-3.5 text-zinc-400" />
              <span>Three-Graph FalkorDB Architecture</span>
            </div>
            <h1 className="mt-4 text-display-lg font-bold tracking-tight text-text-primary sm:text-display-xl">
              Graph-First, LLM-Second
            </h1>
            <p className="mt-4 text-body-lg text-text-secondary leading-relaxed">
              Why we don&apos;t let AI write graph queries. INVARIX uses a three-tier FalkorDB topology to keep tenant
              identities isolated, detection queries provably deterministic, and agent memory persistent across turns.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/w/northwind-pay/graph">
                  Explore the Live Graph in Sandbox
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/rules">Browse the 8 Detection Rules</Link>
              </Button>
            </div>
          </div>
        </Reveal>

        {/* The 3-Graph Model Section */}
        <div className="mt-20">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-400">
                Topology Invariant
              </span>
              <h2 className="mt-2 text-h1 font-bold text-text-primary">Three Graphs Per Workspace</h2>
              <p className="mx-auto mt-3 max-w-2xl text-body text-text-secondary">
                FalkorDB enables thousands of lightweight, isolated graphs in a single instance.
                Each workspace owns three strictly decoupled graphs:
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Reveal delay={0}>
              <div className="glass flex h-full flex-col rounded-2xl border border-border-subtle bg-surface p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Lock className="size-5" />
                </div>
                <h3 className="mt-4 font-mono text-body font-bold text-text-primary">platform_&lt;prefix&gt;</h3>
                <p className="mt-1 text-caption font-semibold uppercase tracking-wider text-text-muted">Identity & Multi-Tenancy</p>
                <p className="mt-3 text-body-sm text-text-secondary leading-relaxed">
                  Stores user accounts, workspace memberships, role-based access control (RBAC), and notifications. Completely decoupled from domain telemetry.
                </p>
                <ul className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-caption text-text-muted">
                  <li>• Labels: <span className="font-mono text-text-primary">User, Workspace, Membership</span></li>
                  <li>• Indexed by Clerk Session JWT</li>
                  <li>• Server-derived graph names (no client leaks)</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="glass flex h-full flex-col rounded-2xl border border-border-strong bg-surface p-6 ring-1 ring-brand/20">
                <div className="flex size-10 items-center justify-center rounded-lg bg-proof-soft text-proof">
                  <Network className="size-5" />
                </div>
                <h3 className="mt-4 font-mono text-body font-bold text-text-primary">org_&lt;ws_id&gt;</h3>
                <p className="mt-1 text-caption font-semibold uppercase tracking-wider text-text-muted">Domain Risk Fabric</p>
                <p className="mt-3 text-body-sm text-text-secondary leading-relaxed">
                  Holds the connected microservice landscape: services, dependency edges, people, teams, compensating controls, and active exceptions.
                </p>
                <ul className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-caption text-text-muted">
                  <li>• Labels: <span className="font-mono text-text-primary">Service, Exception, Person, Team, Control</span></li>
                  <li>• Traversed by Sentinel detection engine</li>
                  <li>• PageRank & betweenness centrality computed here</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="glass flex h-full flex-col rounded-2xl border border-border-subtle bg-surface p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Bot className="size-5" />
                </div>
                <h3 className="mt-4 font-mono text-body font-bold text-text-primary">mem_&lt;ws_id&gt;</h3>
                <p className="mt-1 text-caption font-semibold uppercase tracking-wider text-text-muted">Agent Memory & Precedent</p>
                <p className="mt-3 text-body-sm text-text-secondary leading-relaxed">
                  Persistent episodic, semantic, and procedural memory for the Steward AI assistant. Stores conversational turns (<span className="font-mono text-text-primary">Turn</span>), learned domain facts (<span className="font-mono text-text-primary">Fact</span>), runbooks (<span className="font-mono text-text-primary">Playbook</span>), and on-call handoff tasks (<span className="font-mono text-text-primary">HandoffTask</span>).
                </p>
                <ul className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-caption text-text-muted">
                  <li>• Labels: <span className="font-mono text-text-primary">Turn, Fact, Playbook, HandoffTask, Ref</span></li>
                  <li>• Cross-graph pointers via <span className="font-mono text-text-primary">Ref</span> stub nodes</li>
                  <li>• Enables automated precedent recall &amp; runbook surfacing</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

        {/* The Two-Agent Engine */}
        <div className="mt-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-400">
                Dual-Agent Design
              </span>
              <h2 className="mt-2 text-h1 font-bold text-text-primary">Sentinel & Steward</h2>
              <p className="mt-3 text-body text-text-secondary">
                Clear separation between deterministic mathematical detection and conversational reasoning.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <Reveal delay={0}>
              <div className="glass rounded-2xl border border-border-subtle bg-surface p-8">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-h3 font-semibold text-text-primary">The Sentinel Agent</h3>
                    <p className="text-caption text-text-muted">Autonomous Detection Engine · 0% LLM</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-body-sm text-text-secondary">
                  <p>• <strong>Runs on every graph write or schedule:</strong> Evaluates all 8 Cypher detection rules in under 65ms on a 25-service graph.</p>
                  <p>• <strong>Graph Centrality Scoring:</strong> Calls <code className="rounded bg-sunken px-1.5 py-0.5 text-caption font-mono text-text-primary">algo.pageRank(&apos;Service&apos;, &apos;DEPENDS_ON&apos;)</code> to weight risk by architectural criticality.</p>
                  <p>• <strong>Zero Hallucination:</strong> Produces immutable alert records with verifiable node-ID proof paths.</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="glass rounded-2xl border border-border-subtle bg-surface p-8">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-proof-soft text-proof">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-h3 font-semibold text-text-primary">The Steward Agent</h3>
                    <p className="text-caption text-text-muted">Grounded Conversational Reviewer · Strict Guardrails</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-body-sm text-text-secondary">
                  <p>• <strong>The LLM Never Writes Cypher:</strong> All queries are named, parameterized files in <code className="rounded bg-sunken px-1.5 py-0.5 text-caption font-mono text-text-primary">queries/*.cypher</code>.</p>
                  <p>• <strong>Tool Reads Only:</strong> Calls up to 6 tools per turn. Writes require human approval via <code className="rounded bg-sunken px-1.5 py-0.5 text-caption font-mono text-text-primary">ProposedAction</code> dialogs.</p>
                  <p>• <strong>Groundedness Stripper:</strong> Automatically purges any entity ID that wasn&apos;t present in graph tool outputs before the response reaches the user.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Verification Numbers */}
        <Reveal>
          <div className="mt-24 rounded-2xl border border-border-subtle bg-sunken p-8 sm:p-12">
            <h2 className="text-center text-h2 font-bold text-text-primary">Ground-Truth CI/CD Benchmark</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-body-sm text-text-secondary">
              Measured by our automated ground-truth evaluation harness (<code className="font-mono text-brand">eval/run_eval.py</code>):
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <div className="text-display font-bold text-brand">16.0 ms</div>
                <div className="mt-1 text-caption text-text-muted">p95 Cypher Rule Query Latency</div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <div className="text-display font-bold text-proof">5 / 5</div>
                <div className="mt-1 text-caption text-text-muted">Planted Scenarios Recall</div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <div className="text-display font-bold text-text-primary">0</div>
                <div className="mt-1 text-caption text-text-muted">False Positives on Controls</div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <div className="text-display font-bold text-brand">100%</div>
                <div className="mt-1 text-caption text-text-muted">Owner Resolution Accuracy</div>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
