"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, CalendarClock, ClipboardCheck, FileWarning, Network, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { ExpiryRunway } from "@/components/home/expiry-runway";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ProofPath } from "@/components/proof-path";
import { RuleChip, isRuleId } from "@/components/rule-chip";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { ScoreRing } from "@/components/score-ring";
import { SeverityBadge } from "@/components/severity-badge";
import { useRiskSummary } from "@/components/shell/use-shell-data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useThemeTokens } from "@/lib/hooks";
import type { AlertOut, GraphOut, Page, RunwayItem, ServiceRisk, ServiceRiskDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { ExecutiveHookBanner } from "@/components/home/executive-hook-banner";
import { QuickGuideModal } from "@/components/guide/quick-guide-modal";
import { CiGateShowcase } from "@/components/integrations/ci-gate-showcase";

const PROMPTS = [
  "Which service is carrying the most hidden risk?",
  "Who should own the exceptions whose owner left?",
  "What expires in the next two weeks?",
  "What happens in 30 days if we don't act?",
  "Show me the proof path for payments-gateway",
];

/** SCR-P-01: where hidden risk concentrates right now, and what to do first. */
export function HomeScreen() {
  const api = useApi();
  const { wsId, slug, asOf, personId } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const base = `/w/${slug}`;
  const [quickGuideOpen, setQuickGuideOpen] = useState(false);
  const [ciGateOpen, setCiGateOpen] = useState(false);

  const summary = useRiskSummary();
  const services = useQuery({
    queryKey: ["risk-services", wsId],
    queryFn: ({ signal }) => api<ServiceRisk[]>(wsPath(wsId, "/risk/services"), { signal, query: { limit: 8 } }),
  });
  const selectedId = params.get("service") ?? services.data?.[0]?.service.id;
  const detail = useQuery({
    queryKey: ["risk-service", wsId, selectedId],
    queryFn: ({ signal }) => api<ServiceRiskDetail>(wsPath(wsId, `/risk/services/${selectedId}`), { signal }),
    enabled: !!selectedId,
  });
  const runway = useQuery({
    queryKey: ["runway", wsId],
    queryFn: ({ signal }) => api<RunwayItem[]>(wsPath(wsId, "/risk/runway"), { signal, query: { days: 30 } }),
  });
  const critical = useQuery({
    queryKey: ["alerts", wsId, "critical"],
    queryFn: ({ signal }) => api<Page<AlertOut>>(wsPath(wsId, "/alerts"), { signal, query: { severity: "critical", limit: 4 } }),
  });
  const reviews = useQuery({
    queryKey: ["reviews", wsId, "mine-pending"],
    queryFn: ({ signal }) =>
      api<Page<{ id: string; alert: { label: string }; exception: { label: string } }>>(wsPath(wsId, "/reviews"), {
        signal,
        query: { assigned_to_me: true, status: "pending", limit: 4 },
      }),
    enabled: !!personId,
  });

  const select = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("service", id);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  if (services.data && services.data.every((s) => s.active_exceptions === 0 && s.score === 0)) {
    return (
      <PageContainer width="home">
        <PageHeader title="Home" subtitle="Blank workspace ready for ingestion." />
        <div className="space-y-6">
          <EmptyState
            illustration
            title="Clean workspace ready for your services"
            description="Ingest your architecture and code waivers automatically via CLI or MCP, generate an API key, or add your first service manually."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <Link href={`${base}/services`}>
                    <Plus aria-hidden /> Add service manually
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`${base}/settings/api-keys`}>
                    Generate API key & connect CLI
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => setQuickGuideOpen(true)}>
                  Quick Guide
                </Button>
                <Button type="button" variant="outline" onClick={() => setCiGateOpen(true)}>
                  View PR Bot Gate
                </Button>
              </div>
            }
          />
          <div className="card-e1 max-w-2xl mx-auto p-5 space-y-3">
            <h3 className="font-semibold text-body-base text-text-primary flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              Connect your codebase via CLI &amp; MCP
            </h3>
            <p className="text-body-sm text-text-secondary">
              Set these environment variables in your terminal, CI/CD pipeline, or AI IDE to automatically attach your microservices and exception debt:
            </p>
            <div className="rounded-lg bg-surface-subtle p-3.5 font-mono text-caption text-text-primary space-y-1.5 overflow-x-auto border border-border-subtle">
              <p>export REPRIEVE_WORKSPACE=&quot;{slug}&quot;</p>
              <p>export REPRIEVE_API_KEY=&quot;&lt;your-api-key-from-settings&gt;&quot;</p>
              <p className="text-text-muted pt-1"># Scan your repository for waivers, TODOs, and #nosec tags:</p>
              <p className="text-brand">reprieve scan .</p>
            </div>
            <p className="text-caption text-text-muted">
              Generate secure API keys anytime under{" "}
              <Link href={`${base}/settings/api-keys`} className="text-brand font-medium hover:underline">
                Settings &rarr; API keys
              </Link>.
            </p>
          </div>
        </div>
        <QuickGuideModal open={quickGuideOpen} onOpenChange={setQuickGuideOpen} />
        <CiGateShowcase open={ciGateOpen} onOpenChange={setCiGateOpen} />
      </PageContainer>
    );
  }

  const s = summary.data;
  const openTotal = s ? Object.values(s.open_alerts).reduce((a, b) => a + b, 0) : 0;

  return (
    <PageContainer width="home" className="space-y-6 pt-2">
      <ExecutiveHookBanner
        onOpenGuide={() => setQuickGuideOpen(true)}
        onOpenCiGate={() => setCiGateOpen(true)}
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric href={`${base}/alerts`} icon={BellRing} label="Open alerts" value={s && openTotal} loading={summary.isPending}>
          {s && <SeverityBar counts={s.open_alerts} />}
        </Metric>
        <Metric href={`${base}/exceptions?status=active`} icon={FileWarning} label="Active exceptions" value={s?.active_exceptions} loading={summary.isPending} />
        <Metric
          href={`${base}/exceptions?expiring_within_days=7`}
          icon={CalendarClock}
          label="Expiring in 7 days"
          value={s?.expiring_7d}
          loading={summary.isPending}
          tone={s && s.expiring_7d > 0 ? "warn" : undefined}
        >
          {runway.data && asOf != null && <WeekDots items={runway.data} asOf={asOf} />}
        </Metric>
        <Metric href={`${base}/reviews`} icon={ClipboardCheck} label="Reviews waiting for you" value={s?.my_reviews} loading={summary.isPending} />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card
          title="Risk map"
          className="lg:col-span-7"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/graph`}>
                <Network aria-hidden /> Full graph
              </Link>
            </Button>
          }
        >
          <RiskMap selected={selectedId} onSelect={select} />
        </Card>
        <Card title="Top risk services" className="lg:col-span-5" error={services.error} onRetry={services.refetch}>
          {services.isPending ? (
            <RowsSkeleton />
          ) : (
            <ol className="-mx-2">
              {services.data?.map((r, i) => (
                <li key={r.service.id}>
                  <button
                    type="button"
                    onClick={() => select(r.service.id)}
                    aria-current={r.service.id === selectedId}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-brand-soft",
                      r.service.id === selectedId && "bg-brand-soft shadow-[inset_2px_0_0_var(--brand)]",
                    )}
                  >
                    <span className="tabular w-4 text-caption text-text-muted">{i + 1}</span>
                    <ScoreRing score={r.score} band={r.band} size="sm" />
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="block truncate font-medium">{r.service.label}</span>
                        {r.service.id === "svc_payments_gateway" ? (
                          <span className="shrink-0 rounded bg-danger/10 px-1.5 py-0.2 text-[10px] font-semibold text-danger border border-danger/20">
                            ~$340k/hr exposure
                          </span>
                        ) : r.score >= 0.7 ? (
                          <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.2 text-[10px] font-semibold text-warning border border-warning/20">
                            High blast
                          </span>
                        ) : null}
                      </div>
                      <span className="block truncate text-caption text-text-muted">
                        {r.team?.label ?? "No team"} · {r.active_exceptions} active
                      </span>
                    </span>
                    <span className="hidden gap-1 xl:flex">
                      {r.rule_hits.filter(isRuleId).map((h) => (
                        <RuleChip key={h} rule={h} compact />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card
          title={detail.data ? `Why ${detail.data.service.label}?` : "Why?"}
          className="lg:col-span-8"
          error={detail.error}
          onRetry={detail.refetch}
          action={
            detail.data && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`${base}/services/${detail.data.service.id}`}>Service details</Link>
              </Button>
            )
          }
        >
          {!detail.data ? (
            <RowsSkeleton />
          ) : (
            <div className="space-y-5">
              <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center gap-1">
                  <ScoreRing score={detail.data.score} band={detail.data.band} size="md" />
                  <span className="text-caption text-text-muted">{detail.data.customer_facing ? "Customer-facing" : "Internal"}</span>
                </div>
                <ScoreBreakdown breakdown={detail.data.breakdown} names={detail.data.names} compact />
              </div>
              {detail.data.proof && <ProofPath path={detail.data.proof} compact />}
            </div>
          )}
        </Card>

        <Card title="Needs your attention" className="lg:col-span-4" error={critical.error} onRetry={critical.refetch}>
          <ul className="space-y-3">
            {!personId && (
              <li className="text-body-sm text-text-secondary">
                <Link href={`${base}/reviews`} className="text-brand hover:underline">
                  Link your profile
                </Link>{" "}
                to see reviews assigned to you.
              </li>
            )}
            {reviews.data?.items.map((r) => (
              <AttentionRow key={r.id} href={`${base}/reviews/${r.id}`} icon={ClipboardCheck} title={r.alert.label} meta={`Review · ${r.exception.label}`} />
            ))}
            {critical.data?.items.map((a) => (
              <AttentionRow key={a.id} href={`${base}/alerts/${a.id}`} badge={<SeverityBadge severity={a.severity} />} title={a.title} meta={a.subject.label ?? ""} />
            ))}
            {critical.data?.items.length === 0 && !reviews.data?.items.length && (
              <li className="text-body-sm text-text-muted">No critical alerts or pending reviews.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card title="Expiry runway · next 30 days" error={runway.error} onRetry={runway.refetch}>
        {runway.isPending || asOf == null ? (
          <RowsSkeleton />
        ) : runway.data?.length ? (
          <ExpiryRunway items={runway.data} asOf={asOf} />
        ) : (
          <p className="text-body-sm text-text-muted">Nothing expires in the next 30 days.</p>
        )}
      </Card>

      <AskSteward base={base} />

      <QuickGuideModal open={quickGuideOpen} onOpenChange={setQuickGuideOpen} />
      <CiGateShowcase open={ciGateOpen} onOpenChange={setCiGateOpen} />
    </PageContainer>
  );
}

function Metric({
  href,
  icon: Icon,
  label,
  value,
  loading,
  tone,
  children,
}: {
  href: string;
  icon: typeof BellRing;
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: "warn";
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="card-e1 group block p-4 transition-colors hover:border-border-strong md:p-5">
      <span className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Icon className="size-4" aria-hidden /> {label}
      </span>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-16" />
      ) : (
        <span className={cn("tabular mt-1 block font-display text-metric font-bold", tone === "warn" && "text-sev-moderate")}>{value ?? 0}</span>
      )}
      {children}
    </Link>
  );
}

function Card({
  title,
  action,
  className,
  error,
  onRetry,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  error?: unknown;
  onRetry?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={cn("card-e1 p-4 md:p-5", className)} aria-label={title}>
      <header className="mb-4 flex min-h-8 items-center justify-between gap-2">
        <h2 className="font-sans text-h3 font-semibold">{title}</h2>
        {action}
      </header>
      {error ? (
        <div className="text-body-sm">
          <p className="text-text-secondary">{errorMessage(error)}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function AttentionRow({ href, icon: Icon, badge, title, meta }: { href: string; icon?: typeof BellRing; badge?: ReactNode; title: string; meta: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-start gap-3 rounded-md">
        {badge ?? (Icon && <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />)}
        <span className="min-w-0">
          <span className="line-clamp-2 text-body-sm font-medium group-hover:underline">{title}</span>
          <span className="block truncate text-caption text-text-muted">{meta}</span>
        </span>
      </Link>
    </li>
  );
}

function AskSteward({ base }: { base: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const ask = (text: string) => text.trim() && router.push(`${base}/steward?q=${encodeURIComponent(text.trim())}`);
  return (
    <section className="card-e1 p-4 md:p-5" aria-label="Ask Steward">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label className="relative flex-1">
          <span className="sr-only">Ask Steward</span>
          <Sparkles className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask Steward about risk, owners, or expiries"
            className="h-10 w-full rounded-md border border-border-strong bg-sunken pl-9 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <Button type="submit" aria-label="Ask">
          <ArrowRight aria-hidden />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button key={p} type="button" onClick={() => ask(p)} className="rounded-full border border-border-subtle px-3 py-1 text-body-sm text-text-secondary hover:border-brand hover:text-text-primary">
            {p}
          </button>
        ))}
      </div>
    </section>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

const SEV_ORDER = ["critical", "high", "moderate", "low"] as const;
const SEV_FILL = { critical: "bg-sev-critical", high: "bg-sev-high", moderate: "bg-sev-moderate", low: "bg-sev-low" } as const;

/** Open alerts by severity as one bar; the counts stay readable as text for screen readers and on hover. */
function SeverityBar({ counts }: { counts: Record<string, number> }) {
  const total = SEV_ORDER.reduce((a, k) => a + (counts[k] ?? 0), 0) || 1;
  const label = SEV_ORDER.map((k) => `${counts[k] ?? 0} ${k}`).join(", ");
  return (
    <span className="mt-2 block" title={label}>
      <span className="flex h-2 overflow-hidden rounded-full bg-sunken" role="img" aria-label={label}>
        {SEV_ORDER.map((k) => (counts[k] ? <span key={k} className={`${SEV_FILL[k]} h-full`} style={{ width: `${(counts[k] / total) * 100}%` }} /> : null))}
      </span>
      <span className="mt-1 flex gap-2 text-[11px] text-text-muted" aria-hidden>
        {SEV_ORDER.filter((k) => counts[k]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${SEV_FILL[k]}`} />
            {counts[k]}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Next seven days as dots: filled where something expires (count on hover). */
function WeekDots({ items, asOf }: { items: RunwayItem[]; asOf: number }) {
  const days = Array.from({ length: 7 }, (_, d) => items.filter((i) => Math.floor((i.expires_at - asOf) / 86400) === d).length);
  const overdue = items.filter((i) => i.expires_at < asOf).length;
  return (
    <span className="mt-2 flex items-center gap-1" role="img" aria-label={`${overdue} overdue; next 7 days: ${days.join(", ")}`}>
      {overdue > 0 && <span className="mr-1 rounded bg-sev-critical-soft px-1 text-[10px] font-semibold text-sev-critical">{overdue} overdue</span>}
      {days.map((n, d) => (
        <span key={d} title={`Day +${d}: ${n}`} className={cn("size-2.5 rounded-full", n ? (n > 1 ? "bg-sev-high" : "bg-sev-moderate") : "bg-sunken")} />
      ))}
    </span>
  );
}

// Canvas graph loaded as a whole module on the client (its ForceGraph ref needs a direct import).
const RiskMapCanvas = dynamic(() => import("@/components/home/risk-map-canvas"), { ssr: false });

function RiskMap({ selected, onSelect }: { selected?: string; onSelect: (id: string) => void }) {
  const api = useApi();
  const { wsId } = useWorkspace();
  const tokens = useThemeTokens();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 320 });
  const graph = useQuery({
    queryKey: ["graph", wsId, "services"],
    queryFn: ({ signal }) => api<GraphOut>(wsPath(wsId, "/graph"), { signal, query: { kinds: "Service" } }),
  });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div>
      <div ref={box} className="h-80 cursor-grab touch-pan-y active:cursor-grabbing" role="img" aria-label="Services sized and colored by risk, linked by dependencies. The ranked list beside it has the same data.">
        <Suspense fallback={<Skeleton className="h-full" />}>
          {graph.data && tokens ? <RiskMapCanvas graph={graph.data} tokens={tokens} size={size} selected={selected} onSelect={onSelect} /> : <Skeleton className="h-full" />}
        </Suspense>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-muted">
        {(["critical", "high", "moderate", "low"] as const).map((b) => (
          <span key={b} className="flex items-center gap-1.5 capitalize">
            <span className={`size-2.5 rounded-full ${SEV_FILL[b]}`} aria-hidden /> {b}
          </span>
        ))}
        <span className="ml-auto">Size = score · arrows = depends on · drag or click</span>
      </p>
    </div>
  );
}
