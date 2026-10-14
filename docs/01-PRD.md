# 01 — Product Requirements Document: Reprieve

| Field | Value |
| --- | --- |
| **Product** | Reprieve — the exception debt agent (working title; rename freely) |
| **Version** | 1.0 (draft for build kickoff) |
| **Date** | 2 Oct 2026 |
| **Owner** | Solo founder / developer |
| **Status** | Ready to build |
| **Source** | `Reprieve__Exception_Debt_Agent__Full_Project_Blueprint.md` (v1.0), extended from a hackathon spec into a real-product spec |
| **Companion docs** | `02-tech-stack.md`, `03-backend-database-schema.md`, `04-user-flow-and-screens.md`, `05-ui-ux-design-brief.md`, `06-implementation-plan.md` |

---

## 1. Overview

### 1.1 One-line pitch
*Individually reasonable exceptions add up to one unreasonable risk. Reprieve is the agent that sees the sum.*

### 1.2 What it is
Reprieve is a web product that models every temporary exception an organization grants (security waivers, feature-flag overrides, skipped tests, cost-limit extensions, manual data-export permissions, emergency changes) as a **promise in a graph**: it has an owner, an expiry, a compensating control, and the services it touches.

An AI agent then does what a flat exception register cannot:

1. **Detects compound risk** by traversing relationships (same service, same fallback person, same expiry week, same customer path).
2. **Resolves the current accountable owner** when the recorded owner has left or moved.
3. **Opens a review only when a defined condition breaks**, not on a calendar nag.
4. **Proves every alert** with the shortest path through the graph.
5. **Remembers** what the team decided last time and uses it as precedent.

### 1.3 What it is not
Not a GRC suite, not an auditor-ready compliance product, not an autonomous remediation tool. It is the **relationship-aware layer on top of** whatever register a team already uses.

### 1.4 Product posture
Built as a real, shippable product from day one: real accounts, workspaces, onboarding, and a public landing page. The first public milestone coincides with the Graph Hacks event window (15–18 Oct 2026); judging criteria are intentionally **out of scope** for this document.

---

## 2. Problem and opportunity

### 2.1 Problem statement
Organizations lose track of the temporary workarounds they approve. Each exception is defensible alone; together they quietly become systemic risk, especially when they pile up on one service, depend on one fallback person, or expire in the same week, and when the original owner has left. Existing trackers store flat rows, so the compounding is invisible, and an AI assistant that sees one record at a time cannot explain which service is carrying the most hidden risk or why.

| Layer | Problem |
| --- | --- |
| Organizational | "Temporary" becomes permanent by default; approvals live in tickets and chats, then are forgotten. |
| Structural | Risk compounds across relationships, but registers store flat rows. |
| Ownership | People change teams and leave; the approver is often no longer the accountable person at review time. |
| Agent | Record-at-a-time assistants cannot rank hidden risk, explain it, or remember past decisions. |

### 2.2 Evidence status (honest)
Today the evidence is **desk research and the pattern's plausibility**, not primary user research (blueprint §7: GRC tools track exceptions individually; graph-risk platforms focus on vulnerabilities; "when does a past decision stop being valid" is a stated gap in context-graph thinking). Therefore:

- All persona pain points below are **hypotheses**.
- A validation plan is part of the release plan (§6): 8–10 interviews with security leads and engineering managers during private beta, plus in-product "was this alert useful?" feedback (FR-ALR-09).

### 2.3 Opportunity
A narrow, sharp wedge: **compound-risk detection + owner resolution + proof paths + memory**, sold as an add-on that works with a team's existing process (CSV/JSON import first, connectors later).

---

## 3. Users and jobs to be done

### 3.1 Personas (hypotheses to validate)

| Persona | Role | Primary job | Pain today | Success looks like |
| --- | --- | --- | --- | --- |
| **Maya, Security & Compliance Lead** (economic buyer) | Owns risk posture | "Tell me where hidden risk is concentrating before an audit or incident does." | Spreadsheet of waivers; no view of combinations; surprises at audit. | A ranked list with proof; fewer expired-and-forgotten waivers. |
| **Dev, Engineering Manager / Service Owner** (daily user) | Inherits teams and services | "Tell me when an exception is mine to decide, and why." | Learns of inherited exceptions when something breaks. | Review lands in his inbox with reasons and precedent. |
| **Sam, Platform / SRE Lead** | Owns reliability of shared services | "Show blast radius: which exceptions sit near my critical services." | Cannot see dependency-aware concentration. | Service concentration view and dependency graph. |
| **Ari, Workspace Admin** | Sets up and operates the tool | "Get data in fast and tune thresholds." | Setup friction. | Sample data in 30 s; import in minutes. |

**Anti-persona (v1):** enterprise auditors who need certified evidence chains and SOC-grade attestations.

### 3.2 Jobs to be done
1. When I am preparing for an audit, I want to see every combination of exceptions that raises risk, so I can fix the worst first.
2. When someone leaves or changes team, I want their exceptions re-owned automatically, so nothing is orphaned.
3. When several exceptions pile up near one service, I want to be told once with proof, so I act instead of discovering it in an incident.
4. When I approve a workaround in a chat or ticket, I want it captured as a structured exception with an expiry, so "temporary" stays temporary.
5. When I review a renewal, I want to know what we decided last time, so I stay consistent.

---

## 4. Product principles

1. **Graph-first, LLM-second.** If the graph is removed, the product breaks. If the LLM is removed, the product still works.
2. **Deterministic where it counts.** Scores, owners, and paths come from named queries. The LLM narrates and plans.
3. **Explainability is the feature.** Every alert and answer shows its proof path and cites node IDs.
4. **Human approves every state change.** Agents propose; people decide.
5. **Time to first insight under 3 minutes.** Sample data is a first-class onboarding path.
6. **Honest positioning.** Say what exists, show what is different.
7. **Boring technology, pinned versions.**
8. **Measure.** Ground truth and eval numbers beat adjectives.

---

## 4A. Goals and non-goals

### 4A.1 Goals

| # | Goal (outcome, not output) | Measure |
| --- | --- | --- |
| G1 | Surface compound risk reliably | 5/5 planted scenarios detected, 0 false alarms on control services (eval harness) |
| G2 | Make every answer explainable | 100% of alerts have a proof path; 100% groundedness on Steward answers (automated check) |
| G3 | Route reviews to the right person | 100% owner-resolution accuracy on seeded org changes |
| G4 | Make the product feel immediate | Sign-up to first proof path in under 3 minutes (sample data); p50 activation within first session |
| G5 | Be trustworthy enough to try on real process | No data loss events on paid tier; clear data-handling page; opt-out of cloud LLM |

### 4A.2 Non-goals (v1.0)

| Non-goal | Why |
| --- | --- |
| Full GRC / audit evidence management | Different product; large surface; wedge first. |
| Real connectors (Jira, Slack, Okta, ServiceNow) | Import + paste ingestion validate value cheaper; connectors are roadmap. |
| LLM-generated risk scores | Scores must be reproducible and defensible. |
| Autonomous remediation or auto-approval | Trust and liability; human approves every change. |
| Billing, plans, invoicing | No revenue need in beta; quotas exist, payments do not. |
| Mobile native apps | Responsive web covers review and read flows. |
| SSO/SAML, SCIM | Enterprise phase; Clerk can add later. |

---

## 5. Scope summary

| Release | Target | Contents |
| --- | --- | --- |
| **R0 — Event MVP (v0.1)** | 18 Oct 2026 | Landing, sign-up + verification, minimal onboarding (sample data), dashboard, alerts with proof paths, graph explorer, Steward chat with citations, review flow, outcome memory + precedent, simulated clock, deploy. |
| **R1 — Private beta (v0.5)** | Nov 2026 | Import (CSV/JSON), invites + RBAC, settings, notifications (email), audit log, rule configuration, text ingestion, paid FalkorDB tier with TLS + backups. |
| **R2 — Public beta (v1.0)** | Dec 2026 | API keys + MCP endpoint, bundle export, what-if time travel, quotas, security page, hardening, analytics, accessibility audit. |
| **Future** | 2027 | Connectors, SSO, saved views, bulk actions, Slack/Teams notifications, billing. |

Per-feature release mapping is in §8 (priority column) and `06-implementation-plan.md` (tiers E1/E2/V1).

---

## 6. User stories (by persona)

**Maya (Security Lead)**
- As a security lead, I ask "Which service is carrying the most hidden risk?" and get a ranked answer with a proof path, so I can justify where to act.
- As a security lead, I see exceptions grouped by compound pattern (concentration, fallback, treadmill, collision), so I understand *why* risk is high.
- As a security lead, I tune thresholds and preview what would change, so alerts match our risk appetite. *(P1/P2)*
- As a security lead, I export a workspace bundle, so I have a portable record. *(P2)*

**Dev (Engineering Manager)**
- As an engineering manager, I am told an exception I inherited has no active owner and the review is routed to me with reasons, so I can decide quickly.
- As a reviewer, I see "last time the team renewed this waiver they escalated after the third renewal," so I decide consistently.
- As a reviewer, I decide (renew, revoke, close, reassign, defer) with a required note, so decisions are recorded.

**Sam (Platform Lead)**
- As a platform lead, I see exception concentration within two dependency hops of a service, weighted by how central it is, so I protect critical dependencies.
- As a platform lead, I explore the graph, filter by node type, and highlight the path behind an alert.

**Ari (Admin)**
- As an admin, I create a workspace with sample data in under 30 seconds, so I can evaluate the product immediately.
- As an admin, I import people, services, and exceptions from CSV/JSON with a validation report, so I can load real data. *(P1)*
- As an admin, I invite teammates with roles, so access is least-privilege. *(P1)*
- As an admin, I choose whether the AI may use a cloud model, a private model, or be turned off. *(P1)*

**Any user — edge cases**
- As a user with no data yet, I see an empty state that tells me how to add the first exception.
- As a user whose session expired mid-action, I am returned to the same place after signing in.
- As a user when the server is waking up (cold start), I see a clear progress state, not a blank page.
- As a user when the AI is unavailable, I still see alerts, risk rankings, and owner lookups.

---

## 7. Core concepts

| Term | Meaning |
| --- | --- |
| **Exception** | A time-bound promise to deviate from a control. Fields: kind, severity 1–5, granted/expiry, optional validity condition, edges to owner, approver, waived control, affected services, compensating control, evidence. |
| **Compound risk** | Risk from the combination of exceptions, detected by rules R1–R8. |
| **Proof path** | Shortest chain of nodes and edges that justifies an alert. |
| **Workspace** | Tenant boundary; owns one org graph and one memory graph. |
| **As-of date** | The "today" used for evaluation. Live workspaces use real time; sample workspaces use a simulated clock. |
| **Effective status** | Derived status: an `active` exception whose expiry has passed is *expired* (never persisted, so time travel stays consistent). |
| **Sentinel / Steward** | Detector agent / conversational reviewer agent. |

The eight detection patterns: **R1** expired or expiring, **R2** orphaned owner, **R3** shared single fallback, **R4** service concentration, **R5** renewal treadmill, **R6** expiry collision, **R7** broken compensating control, **R8** customer-path exposure. Full catalog: `03-backend-database-schema.md` §8.

---

## 8. Functional requirements

Priority applies to the **v1.0 public beta**. **P0** = cannot ship without; **P1** = fast follow / private beta; **P2** = designed for, built later. The event MVP (R0) subset is defined in `06-implementation-plan.md`.

### 8.1 Accounts and authentication (AUTH)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-AUTH-01 | Create an account with email and password | P0 | Given a valid email and compliant password, when the visitor submits sign-up, then an unverified account is created and a verification code is emailed within 30 s. |
| FR-AUTH-02 | Email verification required before app access | P0 | Given an unverified account, when it opens any app route or calls the API, then it is routed to verification; wrong codes show an inline error; repeated failures trigger a cooldown. |
| FR-AUTH-03 | Sign in, sign out, password reset | P0 | Given valid credentials, sign-in lands on the last workspace; reset emails a code/link; sign-out ends the session. |
| FR-AUTH-04 | OAuth sign-in (Google, GitHub) | P1 | Given a provider account, sign-in creates or links the account; verified email is trusted per provider. |
| FR-AUTH-05 | Protected routes preserve the return URL | P0 | Given an unauthenticated visit to `/w/acme/alerts/alt_1`, after sign-in the user lands on that URL. |
| FR-AUTH-06 | Profile edit and account deletion | P1 | Given a user who is sole owner of a workspace, deletion is blocked until they transfer or delete it. |
| FR-AUTH-07 | Server-side authorization on every request | P0 | Given user A calls a workspace they are not a member of, the API returns 404 (no existence leak); graph names are derived server-side only. |

### 8.2 Workspaces and access (WS)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-WS-01 | Create a workspace (name, unique slug) | P0 | Slug is validated, unique, and immutable after creation in v1. |
| FR-WS-02 | Switch between workspaces | P0 | Switcher lists memberships; selection persists per user. |
| FR-WS-03 | Role-based access control (owner, admin, reviewer, member, viewer) | P0 | Matrix in `03` §10.5 is enforced server-side; UI hides but never relies on hiding. |
| FR-WS-04 | Invite members by email with a role | P1 | Invite link expires in 7 days, is single-use, and is bound to the invited email. |
| FR-WS-05 | Change role or remove member | P1 | Last owner cannot be removed or downgraded. |
| FR-WS-06 | Delete workspace | P1 | Owner types the workspace name; both graphs are dropped; action is audited. |
| FR-WS-07 | Free-plan quotas | P1 | Soft limits: 5,000 nodes, 5 members, 50 Steward messages/day, 5 MB import; clear limit messaging. |
| FR-WS-08 | Sample workspace labeling | P0 | A persistent banner states "Sample data · simulated date"; "Reset sample" and "Start blank" actions are available to admins. |

### 8.3 Onboarding (ONB)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-ONB-01 | Resumable multi-step onboarding | P0 | Closing the tab mid-flow and returning resumes at the same step; state is stored server-side. |
| FR-ONB-02 | Sample-data path | P0 | Selecting "Explore with sample data" provisions "Northwind Pay" in under 30 s and ends on Home with a high-risk service pre-selected. |
| FR-ONB-03 | Blank-workspace path | P0 | Empty states on each screen give one clear next action. |
| FR-ONB-04 | Import path with mapping and validation | P1 | Row-level errors are listed; commit is all-or-nothing per batch; rollback available. |
| FR-ONB-05 | "This is me" identity link | P0 | User links their account to a Person node so "my reviews" works; skippable with a persistent prompt on Reviews. |
| FR-ONB-06 | Rule preset (Strict, Balanced, Relaxed) | P1 | Balanced is default; presets map to thresholds in `03` §8.2. |
| FR-ONB-07 | Invite teammates (skippable) | P1 | Skipping never blocks completion. |
| FR-ONB-08 | First-insight handoff | P0 | Completion triggers a Sentinel run and shows progress; Home opens on the top risk service. |
| FR-ONB-09 | Product tour (4 coach marks) | P1 | Dismissible; never re-shown after dismissal. |

### 8.4 Exception registry (REG)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-REG-01 | Create and edit an exception | P0 | Required: title, kind, severity, granted_at, expires_at (after granted_at), owner, at least one affected service, waived control. Validation errors are field-level. |
| FR-REG-02 | Lifecycle: draft, active, then renewed/revoked/closed; expired is derived | P0 | Only `active` exceptions participate in detection; transitions are audited. |
| FR-REG-03 | Renewal links to the prior exception | P0 | A renewal waives the same control and creates a `RENEWS` edge; the prior becomes `renewed`. |
| FR-REG-04 | Machine-checkable validity condition | P1 | Condition grammar `var op literal` joined by `and`; evaluated safely (no code execution); a true condition flags a closure review. |
| FR-REG-05 | List, filter, sort, search | P0 | Filters: status, effective status, kind, severity, service, owner, expiring within N days; search by title/id. |
| FR-REG-06 | Exception detail with timeline | P0 | Shows edges, evidence, renewal chain, alerts, reviews, and audit events. |
| FR-REG-07 | Manage services, people, teams, controls, compensating controls, customer paths, runbooks | P0 | Services/people/teams/controls P0; remaining entities P1. Membership and leadership history use `since/until`. |
| FR-REG-08 | Text ingestion to staged draft | P1 | Pasted text yields a draft with unresolved hints flagged; nothing is written as `active` without human approval; injected instructions have no effect. |
| FR-REG-09 | Import CSV/JSON | P1 | See `03` §12. |
| FR-REG-10 | Export workspace bundle | P2 | Produces a JSON bundle importable into a new workspace. |
| FR-REG-11 | Optimistic concurrency | P1 | Stale edits return 409 with the current version; UI offers reload. |
| FR-REG-12 | Agent-requested exceptions flagged | P2 | `requester_kind = agent` follows the same approval path. |

### 8.5 Detection and scoring (DET)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-DET-01 | R1 expired / expiring / condition met | P0 | `expires_at <= as_of + N` (default N = 7 d) for active exceptions; reason code distinguishes the three cases. |
| FR-DET-02 | R2 orphaned owner | P0 | Owner is `left` or no longer on any owning team; candidates ranked by deterministic rules. |
| FR-DET-03 | R3 shared single fallback | P0 | At least k = 2 active exceptions' compensating controls rely on one node. |
| FR-DET-04 | R4 service concentration | P0 | At least k = 3 active exceptions within 2 dependency hops of a service. |
| FR-DET-05 | R5 renewal treadmill | P0 | Renewal chain length of at least 3 on one control. |
| FR-DET-06 | R6 expiry collision | P0 | At least 3 expiries within 7 days on one team/service. |
| FR-DET-07 | R7 broken compensating control | P0 | `verified_ok = false`, stale verification (over 30 d), or missing control on severity 3 or higher. |
| FR-DET-08 | R8 customer-path exposure | P0 | An active exception reaches a customer path through `AFFECTS`/`DEPENDS_ON`/`REQUIRES`. |
| FR-DET-09 | Deterministic score with visible formula | P0 | Same graph + same config + same as-of = same score; breakdown shown in UI. |
| FR-DET-10 | Centrality from PageRank and betweenness | P0 | Normalized and cached per run; fallback to degree centrality if a procedure fails. |
| FR-DET-11 | Clusters via WCC | P1 | List and color clusters in the graph. |
| FR-DET-12 | Proof path for every alert | P0 | Alert stores a minimal node/edge path; UI can animate it. |
| FR-DET-13 | As-of evaluation | P0 | Every read and rule run accepts `as_of`. |
| FR-DET-14 | Alert dedupe, auto-resolve, reopen | P0 | Fingerprint dedupes; cleared conditions resolve automatically; recurrence reopens. |
| FR-DET-15 | Per-workspace thresholds | P1 | Admin edits thresholds with validation and an audit entry. |
| FR-DET-16 | Threshold dry-run ("what would change?") | P2 | Shows alerts added and removed for proposed thresholds without persisting. |
| FR-DET-17 | Sentinel cadence | P0 | Runs on graph change and at least hourly for live workspaces; runs are recorded. |

### 8.6 Alerts, reviews, notifications (ALR)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-ALR-01 | Alerts list with filters | P0 | Filter by severity, rule, status, service, owner. |
| FR-ALR-02 | Alert detail | P0 | Plain-language "why", proof path, contributing exceptions, score breakdown. |
| FR-ALR-03 | Acknowledge and snooze | P0 | Snooze requires reason and until-date; resurfaces automatically. |
| FR-ALR-04 | Propose review routed to the current owner | P0 | Fallback chain: valid owner, active team lead, active approver, workspace admins; reasons displayed. |
| FR-ALR-05 | Review decision | P0 | Decisions: renew, revoke, close, reassign, defer; note required; graph effects are atomic and audited. |
| FR-ALR-06 | Reviews inbox | P0 | Tabs: assigned to me, all, decided. |
| FR-ALR-07 | Notifications | P0 in-app, P1 email | Review assigned and critical alert events; per-user preferences (P1). |
| FR-ALR-08 | Bulk actions | P2 | Multi-select acknowledge. |
| FR-ALR-09 | Alert usefulness feedback | P1 | One-click useful / not useful with optional reason; feeds the precision metric. |

### 8.7 Steward assistant (STW)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-STW-01 | Streaming chat | P0 | First token visible quickly; cancel supported. |
| FR-STW-02 | Tool-only facts with citations | P0 | Every factual claim maps to node IDs returned by tools in the same turn; citations open the entity drawer. |
| FR-STW-03 | Inline proof-path card | P0 | "Show on graph" highlights the path on the explorer. |
| FR-STW-04 | Proposed actions require approval | P0 | Draft reviews and staged exceptions appear as cards with an explicit Approve button. |
| FR-STW-05 | Guardrails | P0 | Max 6 tool calls per turn; per-turn timeout; no free-form Cypher; ingested text treated as data. |
| FR-STW-06 | Groundedness validator | P0 | Uncited or unknown IDs are removed and the user is told; automated test in CI. |
| FR-STW-07 | Session history | P1 | Resume past sessions; delete sessions. |
| FR-STW-08 | Context-aware suggested prompts | P1 | Prompts adapt to the current page and selection. |
| FR-STW-09 | AI mode setting | P1 | Options: cloud (OpenAI), private (local/compatible endpoint), off. |
| FR-STW-10 | Degraded mode | P1 | If the LLM fails, "Quick answers" (risk ranking, owner lookup) still work. |

### 8.8 Memory (MEM)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-MEM-01 | Record review outcomes | P0 | Each decision creates a `ReviewOutcome` in the memory graph. |
| FR-MEM-02 | Precedent recall | P0 | Steward and review dialog show prior outcomes for the same control (and service when available). |
| FR-MEM-03 | Human-approved facts | P1 | "Remember this" creates a fact only after confirmation; facts are editable and deletable. |
| FR-MEM-04 | Handoff tasks visible | P1 | Sentinel-to-Steward tasks have status and are listed. |
| FR-MEM-05 | Memory browser and retention | P1 | Sessions older than 90 days are pruned; users can delete their sessions. |

### 8.9 Graph explorer (GRAPH) and time (TIME)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-GRAPH-01 | Interactive explorer | P0 | Zoom, pan, drag, focus on node, filter by node type. |
| FR-GRAPH-02 | Animated proof-path highlight | P0 | Path draws in sequence; non-path nodes dim; reduced-motion shows a static highlight. |
| FR-GRAPH-03 | Node detail drawer | P0 | Shows properties, edges, related alerts. |
| FR-GRAPH-04 | Search and focus | P1 | Cmd+K entity search focuses the node. |
| FR-GRAPH-05 | Cluster coloring | P1 | WCC components shown with legend. |
| FR-GRAPH-06 | Render cap and expansion | P0 | At most 500 nodes rendered; neighbors expand on demand; table alternative for accessibility. |
| FR-TIME-01 | Simulated clock for sample workspace | P0 | Admin sets as-of date; Sentinel reruns; banner shows "simulated". |
| FR-TIME-02 | What-if preview for live workspaces | P1 | Read-only evaluation at a future date without persisting alerts. |

### 8.10 Settings, API, audit (SET)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-SET-01 | Settings: profile, workspace, members, notifications, AI | P1 | Role-gated pages. |
| FR-SET-02 | API keys and MCP endpoint | P2 | Keys are shown once, stored hashed, scoped read-only by default, revocable. |
| FR-SET-03 | Audit log | P1 | Append-only; filter by actor, action, target; admin-visible. |
| FR-SET-04 | Data retention and deletion | P1 | Workspace deletion drops all data; account deletion within 30 days SLA. |

### 8.11 Marketing, trust, experience (MKT)

| ID | Requirement | Pri | Acceptance criteria |
| --- | --- | --- | --- |
| FR-MKT-01 | Landing page | P0 | Interactive hero, problem, how it works, features, proof of explainability, FAQ, CTA; LCP under 2.5 s. |
| FR-MKT-02 | Security and data-handling page | P1 | States what is stored, what is sent to LLMs, retention, and deletion. |
| FR-MKT-03 | Terms and Privacy | P0 | Required before public sign-ups. |
| FR-MKT-04 | SEO, social previews, sitemap | P1 | OG image, meta, sitemap, robots. |
| FR-MKT-05 | Splash and loading experience | P0 | Branded splash only when hydration exceeds 400 ms; cold-start state explains the wait. |
| FR-MKT-06 | Consent-aware analytics | P1 | No analytics before consent in regions that require it. |

---

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| **Performance** | Rule queries p95 under 200 ms on the seed graph. Full Sentinel run on the 25-service seed under 3 s. Dashboard API p95 under 400 ms (warm). Chat first token p95 under 2.5 s (hosted model, warm). Landing LCP under 2.5 s on a 4G profile; INP under 200 ms. Graph interaction at 60 fps up to 300 nodes. Sample workspace provisioning under 30 s. |
| **Cold start** | Render free tier can take 30–60 s to wake; the UX must handle it (pre-warm on landing visit, explicit waiting state). |
| **Availability** | Beta target 99% monthly on paid data tier. Free tier has no SLA and may be stopped when idle. |
| **Scalability (v1.0)** | 50 workspaces, up to 5,000 nodes each, 10 concurrent users. Re-evaluate at 100 workspaces. |
| **Security** | Tenant isolation by graph; server-derived graph names; JWT verification on every request; RBAC; rate limiting; parameterized named queries only; sanitized markdown rendering; strict CSP; secrets only in environment; dependency scanning. Details: `02` §9. |
| **Data protection** | Free-tier FalkorDB Cloud has **no TLS, no persistence, no backups** — use only synthetic/sample data there. Real customer data requires a paid tier with TLS and backups. |
| **Privacy** | Data inventory documented; LLM payloads minimized (IDs, names, excerpts only); optional PII redaction; AI off/private modes; deletion on request. |
| **Accessibility** | WCAG 2.2 AA; full keyboard operation; visible focus; reduced-motion support; non-visual alternative for the graph (list/table of nodes and edges). |
| **Compatibility** | Latest two versions of Chrome, Edge, Firefox, Safari. Responsive down to 360 px; mobile prioritizes read, review, and chat. |
| **Localization** | English only in v1; timestamps stored in UTC (epoch seconds), displayed in the user's locale. |
| **Reliability** | Idempotent writes (`MERGE`), deterministic IDs, reseed under 30 s, schema bootstrap on boot, rehydrate path when graphs are missing. |
| **Maintainability** | Structural rules (`02` §6) enforced by lint and review; test gates in CI; every query has a test. |
| **Cost** | Beta infrastructure within free tiers except LLM; per-workspace daily token budget; spend alerts. |

---

## 10. Success metrics

### 10.1 Product metrics

| Type | Metric | Target (beta) | Measurement |
| --- | --- | --- | --- |
| Leading | Activation: new workspaces that view a proof path within 10 min of sign-up | at least 60% | Analytics events `workspace_created` → `proof_path_viewed` |
| Leading | Time from sign-up to first proof path (sample path) | under 3 min median | Event timestamps |
| Leading | Onboarding completion | at least 70% | `onboarding_completed / onboarding_started` |
| Leading | Alert usefulness (thumbs up) | at least 70% | FR-ALR-09 |
| Leading | Steward answers with at least one citation | 100% of factual answers | Server check |
| Lagging | Weekly active reviewers per workspace | at least 2 | Distinct users deciding or viewing reviews |
| Lagging | Median time to review decision after alert | under 3 days | Alert created → review decided |
| Lagging | Exceptions closed or revoked after alert | rising trend | Graph counts |
| Lagging | Qualitative: "would be disappointed without it" | at least 40% | Beta survey |

### 10.2 Quality and engineering targets (from blueprint, retained)

| Metric | Target |
| --- | --- |
| Recall on planted scenarios | 5 of 5 |
| False positives on control services | 0 |
| Answer groundedness | 100% (automated) |
| Owner-resolution accuracy on seeded org changes | 100% |
| p95 detection-rule latency on seed | under 200 ms |
| Cold-start demo reset | under 30 s |

---

## 11. Analytics plan

Events (properties exclude PII; IDs are hashed workspace/user IDs): `landing_viewed`, `signup_started`, `signup_completed`, `email_verified`, `onboarding_step_viewed(step)`, `onboarding_completed(path)`, `workspace_created(path)`, `alert_opened(rule_id)`, `proof_path_viewed(source)`, `steward_message_sent`, `steward_answer_rated`, `review_proposed`, `review_decided(decision)`, `exception_created(source)`, `import_started`, `import_committed`, `clock_changed`, `ai_mode_changed`, `alert_feedback(useful)`.

Tools: PostHog (product analytics, consent-aware) and Sentry (errors). See `02` §10.

---

## 12. Constraints, assumptions, dependencies

| Item | Detail | Impact |
| --- | --- | --- |
| FalkorDB is the primary and central database | Required by event; also the product's differentiator. | All domain data and memory live in FalkorDB. |
| FalkorDB Cloud Free tier | 100 MB RAM total; no TLS, persistence, or backups; instances unused for a day are stopped and deleted after seven days. | Free tier is for development and the event only. Keep-alive pings, rehydrate-from-seed, and a paid tier before real data. See `02` §2. |
| Render free web service | Spins down after 15 minutes idle; cold start 30–60 s; 750 instance hours per month. | Pre-warm and waiting UX; paid instance before public beta. |
| Vercel Hobby | Non-commercial; cron limited to once per day. | Use GitHub Actions for scheduling; Pro before commercial launch. |
| Solo developer using Claude Code | Estimates assume heavy assistance. | Strict scope tiers; vertical slices. |
| LLM provider | OpenAI primary; local models for development. | Provider-agnostic adapter; hosted fallback for production. |
| Event window | 15 Oct 00:01 to 18 Oct 23:59 (GMT+5:30); verify rules on the live page. | Defines R0 scope. |

**Assumptions to validate:** buyers will import registers rather than demand live connectors; teams will pay for compound-risk visibility; trust requirements (TLS, backups, data handling) are satisfiable on a small paid stack.

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| FalkorDB procedure/Cypher syntax differs from docs | Medium | High | Day-1 spike; Python fallback for scoring; pinned image tag; query tests |
| Free-tier data loss or idle shutdown | High | High | Rehydrate from seed/bundle; keep-alive; paid tier before real data |
| LLM hallucination | Medium | High | Tool-only facts, citation schema, groundedness check |
| LLM latency or outage | Medium | High | Provider interface, cache, degraded mode, fallback model |
| Scope creep (solo) | High | High | Tiering, feature freeze, parking-lot file |
| Seed data looks fake | Medium | Medium | Planted narratives, realistic names and noise |
| Render cold start harms first impression | High | Medium | Pre-warm, splash/waiting state, paid instance |
| Unproven demand | Medium | High | Private-beta interviews; feedback buttons |
| Overclaiming novelty | Medium | Medium | Honest positioning (§14) |
| Security incident in a young product | Low | Critical | Tenant isolation tests, rate limits, CSP, dependency scanning, no real data on free tier |

---

## 14. Positioning and landscape

As of an early-October 2026 scan (not exhaustive):

- Exception lifecycle exists in GRC tools (ServiceNow GRC, Allgress, ArmorCode Risk Register and others): owners, expiry, approvals, compensating controls, one record at a time.
- Graph-based risk platforms exist, mostly for vulnerabilities (for example Wiz Security Graph, ArmorCode Context Risk Graph).
- Compliance automation (Vanta, Drata) monitors standard controls; exception accumulation is not their headline.
- "Context graph" thinking captures why decisions were made; the open gap is when a past decision stops being valid.

**Positioning statement:** *Existing tools track exceptions individually; Reprieve focuses on how they compound.* Never claim "no one does this."

---

## 15. Open questions

| # | Question | Owner | Blocking? |
| --- | --- | --- | --- |
| 1 | Event rules on pre-event work and license (affects what is prebuilt before 15 Oct) | Founder | Yes, before coding FalkorDB parts |
| 2 | Final OpenAI model for agent and fast roles; local model choice for Ollama | Engineering | No (env-configurable) |
| 3 | Clerk free-tier limits and email deliverability for verification codes | Engineering | Before public launch |
| 4 | Domain name and final product name | Founder | No |
| 5 | Exact free-tier quotas (nodes, members, messages) after measuring memory per workspace | Engineering | No |
| 6 | Whether to offer self-hosting (Docker) as a trust option | Founder | No |
| 7 | Resend free-tier limits for notification emails | Engineering | No |

---

## 16. Appendix: deltas from the blueprint

| Blueprint | This PRD | Reason |
| --- | --- | --- |
| Hackathon demo target | Real product with accounts, workspaces, onboarding, landing | Stated goal: a real product |
| Status `expired` persisted | `expired` is derived (effective status); `draft` added | Time travel must stay consistent when the as-of date moves |
| R6 and R7 tagged SHOULD | R6 and R7 are P0 | Scenario S5 and the 5/5 recall target depend on R6; R7 is cheap |
| Memory nodes absent from §9.1 ontology | Session, Turn, Fact, Playbook, ReviewOutcome, HandoffTask, Ref defined | Complete schema |
| Memory edges point to org nodes | Memory graph uses `Ref` stub nodes | FalkorDB graphs are isolated; no cross-graph edges |
| `simulate_clock` as an LLM tool | LLM gets a non-persisting what-if tool; persisted clock changes are UI/API only | State changes need human approval |
| Score formula illustrative | Normative v1 with hop decay and bounded 0–100 scale | Reproducible and displayable |
| `LEADS` without dates | `LEADS {since, until}` | Correct owner resolution across history |
