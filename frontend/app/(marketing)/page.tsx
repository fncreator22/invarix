"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Layers,
  Flame,
  BrainCircuit,
  UserCheck,
  Cpu,
  Route,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CaseStudiesSection } from "@/components/marketing/case-studies-section";
import { BookCallModal } from "@/components/marketing/book-call-modal";
import { CollisionScrubber } from "@/components/marketing/collision-scrubber";
import { HeroGraphCircuitBreaker } from "@/components/marketing/hero-graph-circuit-breaker";
import { ProofStrip } from "@/components/marketing/proof-strip";
import { PrecedentCard } from "@/components/precedent-card";
import { SeverityBadge } from "@/components/severity-badge";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { cn } from "@/lib/utils";
import { FeaturesCard } from "@/components/ui/features-card";

const TRUST_CHIPS = [
  { icon: UserCheck, text: "A human approves every change" },
  { icon: Cpu, text: "Scores are deterministic, never AI-guessed" },
  { icon: Route, text: "100% Grounded proof paths cite living nodes" },
];

const FAQ = [
  {
    q: "What is INVARIX?",
    a: "An agentic safety platform that tracks temporary exceptions (security waivers, flag overrides, skipped tests, limit extensions) as a graph, detects when they add up to real risk, and routes a review to the person who can decide today.",
  },
  {
    q: "Is it a GRC suite?",
    a: "No. INVARIX does one job: exception debt. It does not manage policies, audits or vendor risk. It complements the tools where exceptions are approved.",
  },
  {
    q: "How are risk scores calculated?",
    a: "With a published, deterministic formula over the graph: exception severity, age, how overdue it is, how central the affected service is, and rule multipliers. The same inputs always give the same score. AI never sets a number.",
  },
  {
    q: "What does the AI do, and what is sent to it?",
    a: "The Steward answers questions and drafts proposals using tools over your graph. It sends entity IDs, names and short excerpts, never whole documents. Every claim must cite an entity, and uncited claims are removed.",
  },
  {
    q: "Can I turn the AI off?",
    a: "Yes. Each workspace has an AI mode. With AI off, detection, scoring, proof paths and reviews keep working; only the Steward and AI-written summaries are disabled.",
  },
  {
    q: "Does anything change without my approval?",
    a: "No. The Steward can only propose. Reviews, activations and other changes need an explicit Approve from someone with the right role.",
  },
  {
    q: "Can I try it without my own data?",
    a: "Yes. The sample workspace, Northwind Pay, loads a realistic payments company with services, people and exceptions so you can explore every feature on a simulated date with zero login.",
  },
  {
    q: "Where is my data stored?",
    a: "In a per-workspace FalkorDB graph database. During the early beta, use the sample workspace or non-sensitive data.",
  },
];

const TELEMETRY_DATA = {
  checkout: {
    service: "checkout-api",
    summary: "4 independent squad waivers directly 2 hops from customer checkout",
    score: "84.0 / 100",
    tier: "Tier-1 Alert (CRITICAL)",
    items: [
      { name: "Skipped load test (Cyber Week)", squad: "Squad Checkout", age: "Expires in 4 days", sev: "critical" as const, decay: "Single point of failure" },
      { name: "Skip fraud validation on retry", squad: "Squad Checkout", age: "12 days overdue", sev: "high" as const, decay: "Cascading to checkout" },
      { name: "Checkout rate limit bypass", squad: "Squad Growth", age: "Expires in 2 days", sev: "high" as const, decay: "Cascading to checkout" },
      { name: "3DS verification fallback override", squad: "Squad Mobile", age: "2x renewed", sev: "moderate" as const, decay: "Cascading to checkout" },
    ],
  },
  auth: {
    service: "card-vault",
    summary: "3 waivers accumulated around HSM tokenization and credential boundary",
    score: "78.5 / 100",
    tier: "Tier-2 Alert (HIGH)",
    items: [
      { name: "Legacy TLS 1.0 waiver", squad: "Squad Auth", age: "64 days overdue", sev: "high" as const, decay: "Upstream ingress exposure" },
      { name: "HSM key rotation deferral", squad: "Squad Security", age: "Owner inactive (Priya Raman)", sev: "high" as const, decay: "Ghost owner unmonitored" },
      { name: "Service mesh mTLS disable", squad: "Squad Platform", age: "Expires in 8 days", sev: "moderate" as const, decay: "Cascading to checkout" },
    ],
  },
  payments: {
    service: "payments-core",
    summary: "4 squad waivers concentrated on high-throughput settlement engine",
    score: "82.4 / 100",
    tier: "Tier-1 Alert (CRITICAL)",
    items: [
      { name: "Payment gateway timeout override", squad: "Squad Settlement", age: "3x renewed", sev: "critical" as const, decay: "Cascading to checkout" },
      { name: "Shared fallback bottleneck: Sam Okafor", squad: "Squad Compliance", age: "3 controls dependent", sev: "high" as const, decay: "Single human failure" },
      { name: "Refund idempotency key waiver", squad: "Squad Disputes", age: "Expires in 6 days", sev: "moderate" as const, decay: "Downstream ledger risk" },
      { name: "Batch settlement retry backoff skip", squad: "Squad Core", age: "18 days overdue", sev: "moderate" as const, decay: "Upstream queue backlog" },
    ],
  },
};

export default function LandingPage() {
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"checkout" | "auth" | "payments">("checkout");

  const currentTelemetry = TELEMETRY_DATA[activeTab];

  return (
    <>
      {/* 01. HERO STAGE */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden py-16 sm:py-20 lg:py-20">
        {/* Subtle Ambient Radial Backlight */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="absolute -top-[180px] h-[500px] w-[900px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,83,232,0.10)_0%,_rgba(8,9,11,0)_70%)] blur-[100px]" />
        </div>

        <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
          <div className="grid gap-10 md:grid-cols-12 md:items-center lg:gap-12">
            {/* Left Column: Mission, Value Claim & Actions */}
            <div className="md:col-span-7 space-y-5 text-left">
              <span className="text-[12px] font-mono uppercase tracking-[0.1em] text-zinc-400 font-semibold block">
                PRE-MERGE ARCHITECTURE SAFETY ENGINE
              </span>

              <h1 id="hero-title" className="text-[2.25rem] sm:text-[2.85rem] md:text-[3.15rem] lg:text-[3.5rem] font-display font-bold tracking-tight text-white leading-[1.08]">
                Three harmless exceptions. One catastrophic collision.{" "}
                <span className="text-zinc-400 font-normal block sm:inline">INVARIX intercepts compound risk before merge.</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
                Sprint boards treat waivers as isolated tickets. INVARIX models temporary bypasses and skipped tests as promises on your microservice graph to stop multi-hop cascading outages.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                <Button asChild size="lg" className="h-11 sm:h-12 px-6 text-sm sm:text-base gap-2 font-semibold bg-[#5848e5] hover:bg-[#4d3ed0] text-white shadow-md shadow-[#5848e5]/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Link href="/sign-up">
                    <Sparkles className="size-4" aria-hidden="true" />
                    Get Started Free
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 sm:h-12 px-6 text-sm sm:text-base border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Link href="/w/northwind-pay/home">
                    Launch Live Sandbox (0 Login)
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Hero Graph Circuit Breaker */}
            <div className="md:col-span-5 flex justify-center md:justify-end">
              <HeroGraphCircuitBreaker />
            </div>
          </div>
        </div>
      </section>

      {/* 02. PROOF STRIP (Immediate Evidence Anchor) */}
      <ProofStrip />

      {/* 03. DOCUMENTED OUTAGE POST-MORTEMS (Money First Wipe Bands) */}
      <CaseStudiesSection />

      {/* 04. HOW IT WORKS (Unified Developer Bento Grid) */}
      <FeaturesCard />

      {/* 05. LIVING COMPOUND RISK & PRODUCT DEMO */}
      <section id="demo" aria-labelledby="telemetry-heading" className="scroll-mt-20 mx-auto max-w-[1280px] px-6 py-20 sm:px-10 sm:py-32">
        <div className="max-w-3xl space-y-4 mb-14 text-left">
          <span className="text-[12px] font-mono uppercase tracking-[0.1em] text-zinc-400 font-semibold">
            LIVING COMPOUND RISK
          </span>
          <h2 id="telemetry-heading" className="text-[2.25rem] sm:text-[2.75rem] font-display font-bold text-white tracking-tight leading-[1.15]">
            Exceptions are approved alone. <br />
            Risk compounds across the graph.
          </h2>
          <p className="text-[1.125rem] text-zinc-300 leading-relaxed">
            Sprint boards treat waivers as isolated tickets. INVARIX projects them onto your microservice topology to catch cascading failures before peak traffic.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Dominant 7-Column Canvas: Live Compound Service Concentration */}
          <div className="lg:col-span-7 rounded-none border border-white/[0.08] bg-[#0c0d12] p-6 sm:p-8 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-none border border-white/10 bg-white/[0.04] text-brand">
                    <Layers className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-[1.25rem] font-bold text-white">Concentration on {currentTelemetry.service}</h3>
                    <p className="text-[12px] text-zinc-400">{currentTelemetry.summary}</p>
                  </div>
                </div>
                <div className="flex rounded-none border border-white/[0.08] bg-[#121316] p-1">
                  {(["checkout", "auth", "payments"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "rounded-none px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                        activeTab === tab
                          ? "bg-white/[0.1] text-zinc-100 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {currentTelemetry.items.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-none border border-white/[0.06] bg-[#08090c] p-3.5 transition-colors hover:border-white/[0.14]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-none bg-white/[0.05] font-mono text-[11px] text-zinc-400">
                        0{idx + 1}
                      </span>
                      <div>
                        <span className="block text-[13px] font-medium text-zinc-200">{item.name}</span>
                        <span className="block text-[11px] text-zinc-400 font-mono">{item.squad} · {item.age}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">{item.decay}</span>
                      <SeverityBadge severity={item.sev} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-[12px]">
              <div className="flex items-center gap-2 text-zinc-300">
                <Flame className="size-4 text-sev-high" aria-hidden="true" />
                <span>Avalanche Risk Score:</span>
                <span className="font-mono font-bold text-white">{currentTelemetry.score} ({currentTelemetry.tier})</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-400">
                Formula: score = Σ base × age × overdue × centrality × multipliers
              </span>
            </div>
          </div>

          {/* 5-Column Side: Live Collision Scrubber & Precedent Memory */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <CollisionScrubber />

            <div className="rounded-none border border-white/[0.08] bg-[#0c0d12] p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-none border border-brand/20 bg-brand/10 text-brand">
                  <BrainCircuit className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h4 className="text-[14px] font-semibold text-zinc-100">Precedent Memory Recall</h4>
                  <span className="text-[11px] font-mono text-zinc-400">FalkorDB Semantic Memory</span>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-zinc-300 leading-relaxed">
                Past review decisions automatically resurface when the same control or service is evaluated.
              </p>
              <div className="mt-4">
                <PrecedentCard
                  precedent={{
                    outcome_id: "out_sample",
                    decision: "revoke",
                    note: "Third renewal with no rotation plan. Revoked; owner to schedule the key rotation.",
                    decided_at: 1789776000,
                    same_service: true,
                    renewal_depth: 2,
                    exception_id: "exc_sample",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Unified Slim Row of Trust Chips */}
        <div className="mt-8 rounded-none border border-white/[0.08] bg-[#0c0d12] p-4">
          <ul className="grid gap-4 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
            {TRUST_CHIPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 px-2 pt-2 sm:pt-0 sm:px-4">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-none bg-brand/10 text-brand">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-[13px] font-medium text-zinc-300">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 06. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 mx-auto max-w-[1120px] px-6 py-20 sm:px-10 sm:py-32">
        <div className="max-w-2xl space-y-3 mb-10 text-left">
          <span className="text-[12px] font-mono uppercase tracking-[0.1em] text-zinc-400 font-semibold">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 id="faq-title" className="text-[2.25rem] sm:text-[2.75rem] font-display font-bold text-white tracking-tight leading-[1.15]">
            Frequently Asked Questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-8 border-t border-white/[0.08]">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`} className="border-b border-white/[0.08] py-2">
              <AccordionTrigger className="text-left text-[16px] font-medium text-zinc-200 hover:text-white">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] text-zinc-400 leading-relaxed pt-1 pb-4">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* 07. FINAL CONVERSION CTA */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1280px] px-6 pb-24 sm:px-10">
        <div className="rounded-none border border-white/[0.08] bg-[#0c0d12] p-8 sm:p-14 text-left sm:text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 id="cta-title" className="text-[2rem] sm:text-[2.5rem] font-display font-bold text-white tracking-tight leading-[1.15]">
              Map and intercept exception debt across your architecture
            </h2>
            <p className="text-[1.125rem] text-zinc-300 leading-relaxed">
              Book a 15-minute confidential architecture audit, or explore our live Northwind Pay environment today.
            </p>
            <div className="pt-4 flex flex-wrap gap-4 sm:justify-center">
              <Button
                size="lg"
                onClick={() => setBookCallOpen(true)}
                className="rounded-none gap-2 font-semibold bg-brand-solid hover:bg-brand-solid/90 text-white shadow-xl shadow-brand-solid/25 px-7 py-6 text-body-base"
              >
                <Calendar className="size-4" aria-hidden="true" />
                Book Architecture Audit
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-none border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white px-7 py-6 text-body-base font-semibold">
                <Link href="/w/northwind-pay/home">
                  Launch Live Sandbox (0 Login)
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      <BookCallModal open={bookCallOpen} onOpenChange={setBookCallOpen} />
    </>
  );
}
