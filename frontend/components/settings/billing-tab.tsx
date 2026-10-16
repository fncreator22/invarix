"use client";

import { useState } from "react";
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Download,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface PricingTier {
  id: "community" | "team" | "enterprise" | "sovereign";
  name: string;
  badge?: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  quotas: {
    workspaces: string;
    seats: string;
    tokensPerDay: string;
    historyRetention: string;
  };
  features: string[];
  ctaLabel: string;
  isPopular?: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: "community",
    name: "Community",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Self-serve developers exploring deterministic graph invariants.",
    quotas: {
      workspaces: "1 Workspace",
      seats: "3 Members",
      tokensPerDay: "50,000 / day",
      historyRetention: "7 Days Memory",
    },
    features: [
      "Northwind demo & blank slate",
      "8 Core Sentinel rules (R1–R8)",
      "Read-only IDE MCP endpoints",
      "Community Discord support",
    ],
    ctaLabel: "Active Plan",
  },
  {
    id: "team",
    name: "Team Growth",
    priceMonthly: 499,
    priceAnnual: 399,
    isPopular: true,
    badge: "Current Plan",
    description: "Engineering teams enforcing pre-merge circuit breakers in production CI/CD.",
    quotas: {
      workspaces: "3 Workspaces",
      seats: "15 Members",
      tokensPerDay: "400,000 / day",
      historyRetention: "90 Days Memory",
    },
    features: [
      "Everything in Community",
      "Slack & HMAC Signed Webhooks",
      "Automated Sentinel scan crons",
      "Avalanche Centrality (P = p₀ʰ)",
      "24h Email support SLA",
    ],
    ctaLabel: "Current Subscription",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 3500,
    priceAnnual: 2800,
    description: "Enterprises needing deep Nemotron AI reasoning and external MCP tools.",
    quotas: {
      workspaces: "Unlimited",
      seats: "100 Members",
      tokensPerDay: "2,000,000 / day",
      historyRetention: "1 Year Memory",
    },
    features: [
      "Everything in Team",
      "Nemotron-3-Super / 3.5-Lightning",
      "Expiry Collision Storm simulation",
      "SAML/SSO via Okta & Clerk",
      "SOC2 Type II Audit Evidence",
      "Dedicated Slack channel & 4h SLA",
    ],
    ctaLabel: "Upgrade to Enterprise",
  },
  {
    id: "sovereign",
    name: "Sovereign Scale",
    priceMonthly: 8500,
    priceAnnual: 6800,
    description: "Air-gapped VPC deployments with zero-data-retention compliance guarantees.",
    quotas: {
      workspaces: "Unlimited",
      seats: "Unlimited",
      tokensPerDay: "BYOK / Unlimited",
      historyRetention: "Custom Retention",
    },
    features: [
      "Everything in Enterprise",
      "Air-gapped FalkorDB instance",
      "Custom Cypher rule creation (R9+)",
      "Zero-Data-Retention mode",
      "99.99% Uptime SLA",
      "Dedicated Staff Engineer liaison",
    ],
    ctaLabel: "Contact Solutions Architect",
  },
];

export function BillingTab() {
  const { wsId } = useWorkspace();
  const [annualBilling, setAnnualBilling] = useState(true);
  const [activeTier, setActiveTier] = useState<string>("team");

  function handleSelectTier(tierId: string) {
    if (tierId === activeTier) {
      toast.info("This is your active subscription plan.");
      return;
    }
    setActiveTier(tierId);
    toast.success(`Plan updated to ${tierId.toUpperCase()}. Quota breakers recalibrated.`);
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-xl border border-border-subtle bg-surface/70 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg border border-border-subtle bg-raised text-brand">
              <CreditCard className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-brand font-semibold px-1.5 py-0.5 bg-brand-soft border border-brand/20">
                  Tiered B2B Pricing & Monetization
                </span>
                <span className="font-mono text-[10px] uppercase text-emerald-500 font-semibold px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20">
                  Team Plan Active
                </span>
              </div>
              <h2 className="text-h2 font-semibold tracking-tight text-text-primary">
                Plans, Quotas & Enterprise Licensing
              </h2>
              <p className="text-body-sm text-text-secondary mt-0.5">
                Scale from local AST pre-commit scans to enterprise-wide microservice dependency graph verification.
              </p>
            </div>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center gap-2 bg-surface-sunken p-1 rounded-lg border border-border-subtle self-start md:self-auto">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                !annualBilling ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1",
                annualBilling ? "bg-surface text-brand font-semibold shadow-sm" : "text-text-muted hover:text-text-primary"
              )}
            >
              <span>Annual</span>
              <span className="rounded bg-brand-soft px-1 text-[10px] text-brand uppercase font-bold">20% off</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tier Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((tier) => {
          const price = annualBilling ? tier.priceAnnual : tier.priceMonthly;
          const isCurrent = activeTier === tier.id;

          return (
            <div
              key={tier.id}
              className={cn(
                "rounded-xl border bg-surface p-5 flex flex-col justify-between transition-all relative",
                isCurrent ? "border-brand shadow-glow ring-1 ring-brand/50" : "border-border-subtle hover:border-brand/40"
              )}
            >
              {tier.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text-on-brand shadow-sm font-semibold">
                  {tier.badge}
                </span>
              )}

              <div>
                <h3 className="font-semibold text-body-lg text-text-primary">{tier.name}</h3>
                <p className="text-caption text-text-muted mt-1 min-h-[38px]">{tier.description}</p>

                <div className="my-4 pb-4 border-b border-border-subtle">
                  <div className="flex items-baseline gap-1">
                    <span className="text-display-lg font-bold text-text-primary font-mono">${price}</span>
                    <span className="text-caption text-text-muted">/ month</span>
                  </div>
                  {annualBilling && price > 0 && (
                    <span className="text-[10px] text-emerald-500 font-mono">Billed annually (${price * 12}/yr)</span>
                  )}
                </div>

                {/* Quota Highlights */}
                <div className="space-y-1.5 mb-4 text-xs font-mono bg-surface-sunken p-2.5 rounded border border-border-subtle">
                  <div className="flex justify-between text-text-secondary">
                    <span>Tokens:</span>
                    <strong className="text-text-primary">{tier.quotas.tokensPerDay}</strong>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Seats:</span>
                    <strong className="text-text-primary">{tier.quotas.seats}</strong>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Memory:</span>
                    <strong className="text-text-primary">{tier.quotas.historyRetention}</strong>
                  </div>
                </div>

                {/* Feature List */}
                <ul className="space-y-2 text-caption text-text-secondary">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-5 mt-5 border-t border-border-subtle">
                <Button
                  variant={isCurrent ? "secondary" : tier.id === "enterprise" ? "aurora" : "default"}
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => handleSelectTier(tier.id)}
                >
                  {isCurrent ? "Current Plan" : tier.ctaLabel}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice & Payment Security Section */}
      <section className="card-e1 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
              <Building className="size-4 text-brand" />
              Enterprise Billing & Purchase Orders
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Automated invoice receipt generation, VAT/tax validation, and wire transfer payment support.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Downloaded latest invoice statement (PDF).")}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="size-3.5" />
              <span>Download Statement</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-text-muted block text-[10px]">PAYMENT METHOD</span>
            <span className="font-medium text-text-primary">Visa ending •••• 4242</span>
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">NEXT RENEWAL</span>
            <span className="font-medium text-text-primary">Nov 15, 2026</span>
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">BILLING CONTACT</span>
            <span className="font-medium text-text-primary">billing@northwind.io</span>
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">TAX ID / VAT</span>
            <span className="font-medium text-emerald-500">Validated (EU/US)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
