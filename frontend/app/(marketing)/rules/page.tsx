import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, Network, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { CLERK_ENABLED } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "Compound Risk Detection Rules · Reprieve",
  description: "Explore the 8 deterministic Cypher graph traversal rules (R1-R8) powering Reprieve's exception risk detection engine.",
};

interface RuleDetail {
  id: string;
  code: string;
  title: string;
  category: "Topology" | "Lifecycle" | "Ownership" | "Mitigation";
  severity: "critical" | "high" | "moderate" | "low";
  plainEnglish: string;
  whyItMatters: string;
  sampleScenario: string;
  cypher: string;
  queryFile: string;
}

const RULES: RuleDetail[] = [
  {
    id: "r8",
    code: "R8",
    title: "Customer-Path Exposure",
    category: "Topology",
    severity: "critical",
    plainEnglish: "An active exception reaches an externally critical user journey via dependency edges within 3 hops.",
    whyItMatters: "Most exceptions seem low-risk in isolation. When an unreviewed TLS or auth bypass sits directly upstream of checkout or user registration, an outage hits external revenue immediately.",
    sampleScenario: "Northwind Pay S1: Checkout customer path requires checkout-api, which depends on payments-gateway, where a severity-4 3DS bypass exception is active.",
    queryFile: "backend/app/graph/queries/rule_r8_customer_path.cypher",
    cypher: `MATCH p = (cp:CustomerPath)-[:REQUIRES]->(:Service)-[:DEPENDS_ON*0..3]->(:Service)<-[:AFFECTS]-(e:Exception {status:'active'})
RETURN cp.id AS path_id, cp.name AS path_name, e.id AS exception_id, e.title AS title, e.severity AS severity,
       [n IN nodes(p) | n.id] AS path_ids`,
  },
  {
    id: "r2",
    code: "R2",
    title: "Orphaned Owner (Ghost Owner)",
    category: "Ownership",
    severity: "high",
    plainEnglish: "The exception's assigned owner has left the company or is no longer on any owning team.",
    whyItMatters: "Reviews and renewals silently route to an unmonitored inbox. The waiver persists indefinitely because no active engineer is accountable for closing it.",
    sampleScenario: "Northwind Pay S2: Priya Raman owned the card-vault HSM key rotation exception and left on August 31. Reassigned automatically to Payments lead Marcus Bell.",
    queryFile: "backend/app/graph/queries/rule_r2_orphaned_owner.cypher",
    cypher: `MATCH (e:Exception {status:'active'})-[:OWNED_BY]->(p:Person)
OPTIONAL MATCH (e)-[:AFFECTS]->(:Service)<-[:OWNS]-(t:Team)
WITH e, p, collect(DISTINCT t.id) AS owning_team_ids
OPTIONAL MATCH (p)-[m:MEMBER_OF]->(t2:Team)
WHERE t2.id IN owning_team_ids AND m.since <= $as_of AND (m.until IS NULL OR m.until > $as_of)
WITH e, p, owning_team_ids, count(m) AS current_memberships
WHERE p.status <> 'active' OR (size(owning_team_ids) > 0 AND current_memberships = 0)
RETURN e.id AS exception_id, e.title AS title, e.severity AS severity, p.id AS owner_id, p.name AS owner_name,
       CASE WHEN p.status <> 'active' THEN 'left' ELSE 'moved' END AS reason, owning_team_ids`,
  },
  {
    id: "r4",
    code: "R4",
    title: "Service Concentration",
    category: "Topology",
    severity: "critical",
    plainEnglish: "At least 3 active exceptions accumulate within 2 dependency hops of a single core service.",
    whyItMatters: "Microservices degrade gracefully until multiple unmitigated waivers concentrate around the same bottleneck, triggering cascade failures during traffic spikes.",
    sampleScenario: "Northwind Pay S1: checkout-api carries 5 active exceptions within its 2-hop dependency radius.",
    queryFile: "backend/app/graph/queries/radius_paths.cypher",
    cypher: `// Radius traversal evaluated for concentration (R4) & PageRank scoring
MATCH p = (s:Service)-[:DEPENDS_ON*0..2]->(t:Service)<-[:AFFECTS]-(e:Exception {status:'active'})
RETURN s.id AS service_id, e.id AS exception_id, [n IN nodes(p) | n.id] AS path_ids`,
  },
  {
    id: "r3",
    code: "R3",
    title: "Shared Fallback Bottleneck",
    category: "Mitigation",
    severity: "high",
    plainEnglish: "Multiple compensating controls across different exceptions depend on the same individual or single point of failure.",
    whyItMatters: "If three automated compliance controls are waived on condition that 'Sam Okafor manually spot-checks transactions', Sam becomes a single human point of failure.",
    sampleScenario: "Northwind Pay S3: 3 compensating controls for refunds, fraud, and vault logs all rely on Sam Okafor.",
    queryFile: "backend/app/graph/queries/rule_r3_shared_fallback.cypher",
    cypher: `MATCH (e:Exception {status:'active'})-[:COMPENSATED_BY]->(cc:CompensatingControl)-[:RELIES_ON]->(x)
WITH x, collect(DISTINCT e.id) AS exception_ids, collect(DISTINCT [e.id, cc.id]) AS pairs, max(e.severity) AS max_severity
WHERE size(exception_ids) >= $k
RETURN x.id AS dependency_id, labels(x)[0] AS dependency_kind, x.name AS dependency_name,
       exception_ids, pairs, max_severity`,
  },
  {
    id: "r5",
    code: "R5",
    title: "Renewal Treadmill",
    category: "Lifecycle",
    severity: "moderate",
    plainEnglish: "An exception on the same control has been renewed 3 or more times consecutively without remediation.",
    whyItMatters: "Temporary exceptions frequently become permanent architecture debt when renewals are rubber-stamped without escalating to architectural refactoring.",
    sampleScenario: "Northwind Pay S4: TLS-pinning waiver on mobile-api renewed 3 times (chain length = 4).",
    queryFile: "backend/app/graph/queries/rule_r5_renewal_chain.cypher",
    cypher: `MATCH (latest:Exception {status:'active'})-[:WAIVES]->(c:Control)
WHERE NOT ()-[:RENEWS]->(latest)
MATCH p = (latest)-[:RENEWS*1..10]->(root:Exception)
WHERE NOT (root)-[:RENEWS]->()
WITH latest, c, p, length(p) + 1 AS chain_length
WHERE chain_length >= $k
RETURN latest.id AS exception_id, latest.title AS title, c.id AS control_id, c.name AS control_name, chain_length,
       [n IN nodes(p) | n.id] AS chain_ids`,
  },
  {
    id: "r6",
    code: "R6",
    title: "Expiry Collision Window",
    category: "Lifecycle",
    severity: "high",
    plainEnglish: "Three or more exceptions belonging to the same service or engineering team expire within a tight 7-day window.",
    whyItMatters: "Engineering teams get swamped by sudden bulk review waves, resulting in hurried blanket renewals without proper security assessments.",
    sampleScenario: "Northwind Pay S5: 4 Data Platform exceptions expire simultaneously between Oct 28 and Nov 2.",
    queryFile: "backend/app/graph/queries/rule_r6_collision_team.cypher",
    cypher: `MATCH (t:Team)-[:OWNS]->(s:Service)<-[:AFFECTS]-(e:Exception {status:'active'})
WHERE e.expires_at >= $as_of AND e.expires_at <= $as_of + $horizon_s
WITH t, collect(DISTINCT e) AS es, collect(DISTINCT [e.id, s.id]) AS pairs
UNWIND es AS anchor
WITH t, es, pairs, anchor,
     [x IN es WHERE x.expires_at >= anchor.expires_at AND x.expires_at <= anchor.expires_at + $window_s | x.id] AS in_window
WHERE size(in_window) >= $k
RETURN t.id AS team_id, t.name AS team_name, anchor.id AS anchor_id, anchor.expires_at AS window_start,
       in_window AS exception_ids, size(in_window) AS n, pairs
ORDER BY n DESC, window_start ASC`,
  },
  {
    id: "r7",
    code: "R7",
    title: "Broken Compensating Control",
    category: "Mitigation",
    severity: "high",
    plainEnglish: "A high-severity exception (Severity >= 3) has an unverified, stale, or missing compensating control.",
    whyItMatters: "Waiving a critical control is only acceptable if a working mitigation exists. If the fallback check failed its last audit, the system has zero protection.",
    sampleScenario: "Manual audit check unverified for over 30 days while a critical PCI-DSS encryption rule remains waived.",
    queryFile: "backend/app/graph/queries/rule_r7_broken_comp_control.cypher",
    cypher: `MATCH (e:Exception {status:'active'})-[:WAIVES]->(ctl:Control)
OPTIONAL MATCH (e)-[:COMPENSATED_BY]->(cc:CompensatingControl)
WITH e, ctl, collect(cc) AS ccs
WITH e, ctl, ccs,
     [c IN ccs WHERE c.verified_ok = false OR c.last_verified_at IS NULL
                  OR c.last_verified_at < $as_of - $max_age_s | c.id] AS bad_ids
WHERE (size(ccs) = 0 AND e.severity >= $missing_min_severity) OR size(bad_ids) > 0
RETURN e.id AS exception_id, ctl.id AS control_id, e.title AS title, e.severity AS severity, bad_ids,
       CASE WHEN size(ccs) = 0 THEN 'missing' ELSE 'stale_or_failed' END AS reason`,
  },
  {
    id: "r1",
    code: "R1",
    title: "Expired or Imminent Expiration",
    category: "Lifecycle",
    severity: "moderate",
    plainEnglish: "An active exception has surpassed its expiry timestamp or expires within 7 days.",
    whyItMatters: "Ensures no waiver lapses into an unmonitored zombie state without an explicit human review or remediation ticket.",
    sampleScenario: "Waiver expires within 48 hours and requires immediate reviewer triage.",
    queryFile: "backend/app/graph/queries/rule_r1_expiring.cypher",
    cypher: `MATCH (e:Exception {status:'active'})-[:WAIVES]->(c:Control)
WHERE e.expires_at <= $as_of + $window_s OR e.condition_met = true
RETURN e.id AS exception_id, e.title AS title, e.severity AS severity, e.expires_at AS expires_at, c.id AS control_id,
       CASE WHEN e.expires_at < $as_of THEN 'expired'
            WHEN e.condition_met = true THEN 'condition_met'
            ELSE 'expiring' END AS reason`,
  },
];

export default function RulesPage() {
  return (
    <div className="relative pt-24 pb-20">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,125,255,0.15),transparent)]" />

      <main className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Header */}
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-300">
              <span>FalkorDB Graph Traversal Engine</span>
            </div>
            <h1 className="mt-4 text-display-lg font-bold tracking-tight text-text-primary sm:text-display-xl">
              The 8 Compound Risk Rules
            </h1>
            <p className="mt-4 text-body-lg text-text-secondary">
              Reprieve does not ask an LLM to guess security risk. Our Sentinel engine runs deterministic,
              parameterized Cypher queries across your service and ownership graph in sub-20ms.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/w/northwind-pay/alerts">
                  Explore Live Alerts in Sandbox
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/architecture">View 3-Graph Architecture</Link>
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Rules Grid */}
        <div className="mt-16 space-y-8">
          {RULES.map((rule, idx) => (
            <Reveal key={rule.id} delay={idx * 0.04}>
              <article
                id={rule.id}
                className="glass relative overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8 transition-colors hover:border-border-strong"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-body font-bold text-brand">
                        {rule.code}
                      </span>
                      <h2 className="text-h3 font-semibold text-text-primary">{rule.title}</h2>
                    </div>
                    <p className="mt-3 text-body font-medium text-text-primary">{rule.plainEnglish}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:self-start">
                    <Badge variant={rule.severity}>
                      {rule.severity.toUpperCase()}
                    </Badge>
                    <span className="rounded-full bg-sunken px-2.5 py-1 text-caption font-medium text-text-muted">
                      {rule.category}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-caption font-semibold uppercase tracking-wider text-text-muted">Why This Matters</h3>
                      <p className="mt-1 text-body-sm text-text-secondary leading-relaxed">{rule.whyItMatters}</p>
                    </div>

                    <div>
                      <h3 className="text-caption font-semibold uppercase tracking-wider text-text-muted">Planted Seed Scenario</h3>
                      <div className="mt-1 flex items-start gap-2 rounded-lg bg-sunken p-3 text-body-sm text-text-secondary">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                        <span>{rule.sampleScenario}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="flex items-center gap-1.5 text-caption font-mono font-medium text-proof">
                        <Code2 className="size-3.5" />
                        {rule.queryFile}
                      </span>
                      <span className="text-caption text-text-muted">FalkorDB Cypher</span>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-sunken p-3.5 font-mono text-[12.5px] leading-relaxed text-text-primary border border-border-subtle">
                      <code>{rule.cypher}</code>
                    </pre>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Bottom Banner */}
        <Reveal>
          <div className="mt-16 rounded-2xl border border-white/[0.08] bg-[#0c0d10] p-8 text-center sm:p-12 shadow-sm">
            <h2 className="text-h2 font-bold text-text-primary">Want to test these rules against your own services?</h2>
            <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
              Load our Northwind Pay dataset in under 30 seconds or connect your microservice dependency map.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/w/northwind-pay/home">
                  Launch Northwind Pay Sandbox
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
