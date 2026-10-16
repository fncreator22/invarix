# INVARIX / INVARIX — Production Admin Platform & Pricing Architecture Plan

> **Status:** Architecture Blueprint & Implementation Specification  
> **Author:** Principal Systems & Security Architect  
> **Target Audience:** Engineering, Product, Security & Compliance Teams  

---

## 1. Executive Summary & Problem Statement

INVARIX currently enforces workspace-level security and isolation through a three-graph FalkorDB model (`platform_<prefix>`, `org_<ws_id>`, `mem_<ws_id>`). While workspace admins can manage their own members and run Sentinel risk scans, **the platform lacks a centralized SuperAdmin Control Plane**, a **tiered B2B billing engine**, and an **admin-driven notification broadcast system**.

In a production enterprise SaaS environment, operators require:
1. **Cross-Tenant Administration**: Managing all users, organizations, and workspaces from a centralized console.
2. **Quota & Rate-Limit Management**: Dynamic token allocation, burst controls, and model switching without code deployments.
3. **Centralized Notification Engine**: Broadcasting critical security advisories, scheduled maintenance notices, and quota warnings via Email (Maileroo/Resend) and In-App Banners.
4. **B2B Tiered Monetization**: Turnkey monetization supporting Self-Serve Developer, Growth Team, and Sovereign Enterprise tiers.
5. **Regulatory & Compliance Enforcement**: GDPR/CCPA self-serve data erasure, SOC2 audit logging, and automated compliance reports.

---

## 2. Multi-Tenant Architecture & Data Isolation

### 2.1 The Three-Graph Isolation Invariant
INVARIX isolates tenants at the database engine level in FalkorDB:

| Graph Identifier | Scope | Data Types Stored | Access Boundary |
|---|---|---|---|
| `platform_<prefix>` | Global Control Plane | Users, Workspaces, Memberships, Subscriptions, Platform Logs | SuperAdmin & System Auth |
| `org_<ws_id>` | Single Workspace Domain | Services, Exceptions, Controls, Alerts, Customer Paths, People | Workspace Members (Scoped) |
| `mem_<ws_id>` | Single Workspace Memory | Sessions, Turns, Citations, Facts, Playbooks, HandoffTasks | Workspace Members (User Scoped) |

**Cross-Tenant Isolation Guarantee:**
- Cross-graph edges are physically impossible in FalkorDB.
- Cross-workspace queries are strictly prohibited; every database query is bound to a single workspace repository (`Repo(db, graph_names(ws_id).org)`).
- Within `mem_<ws_id>`, conversation sessions are isolated by `user_id` (`MATCH (s:Session {user_id: $user_id})`).

---

## 3. SuperAdmin Control Plane Architecture

### 3.1 Role Hierarchy & Permissions (RBAC)

```
[ SuperAdmin (Global) ]
       │
       ├── Platform Config & Feature Flags
       ├── Global Tenant & User Directory
       ├── System-Wide Notification Broadcasts
       └── Billing & Plan Overrides
       │
[ Workspace Admin ]
       │
       ├── Member Invites & Role Assignment (Admin, Reviewer, Member, Viewer)
       ├── Workspace Integrations (Slack, Webhooks, CI/CD)
       ├── GDPR/CCPA Data Erasure & Slate Reset
       └── Sentinel Scan Execution
       │
[ Reviewer ]
       │
       └── Approve/Reject Exception Reviews & Proposed Actions
       │
[ Member ]
       │
       └── View Graphs, Chat with Steward, Propose Reviews
       │
[ Viewer ]
       │
       └── Read-Only Inspection (Secrets Masked)
```

### 3.2 SuperAdmin Endpoints Specification (`/api/v1/admin/*`)

```http
# Global User Management
GET    /api/v1/admin/users                 # List all platform users with active workspace counts
GET    /api/v1/admin/users/{user_id}       # Detailed user profile, auth logs, active sessions
PATCH  /api/v1/admin/users/{user_id}/status # Suspend, reactivate, or force-logout user
POST   /api/v1/admin/users/impersonate     # Generate scoped read-only session for support audit

# Global Workspace Management
GET    /api/v1/admin/workspaces            # List all workspaces with storage stats, alert counts, and token consumption
GET    /api/v1/admin/workspaces/{ws_id}    # Deep inspection: node/edge count, memory footprint, active integrations
PATCH  /api/v1/admin/workspaces/{ws_id}/plan # Upgrade/downgrade subscription plan
PATCH  /api/v1/admin/workspaces/{ws_id}/quota # Adjust token budget (e.g. 400k -> 2M tokens/day)
POST   /api/v1/admin/workspaces/{ws_id}/freeze # Freeze workspace (read-only lock during investigations)
DELETE /api/v1/admin/workspaces/{ws_id}/purge # Permanent hard deletion (drops org & mem graphs, wipes platform records)

# Broadcast & Notifications
POST   /api/v1/admin/notifications/broadcast # Send global or filtered in-app announcement banner
POST   /api/v1/admin/notifications/email     # Send bulk operational email via Maileroo / Resend

# Telemetry & Compliance
GET    /api/v1/admin/metrics/llm           # Aggregated token usage across OpenAI and Nemotron models
GET    /api/v1/admin/audit-logs            # Immutable platform-wide event ledger (who did what, when)
```

---

## 4. Admin-Side Notification & Alert Broadcast System

### 4.1 Channels & Dispatchers
The notification engine operates across 3 primary surfaces:
1. **In-App Banners (`SystemAnnouncement`)**:
   - Pushed via Server-Sent Events (SSE) or fetched during workspace layout mount.
   - Severity levels: `info` (blue), `warning` (amber), `critical` (red).
   - Dismissible with `sessionStorage` or permanent until resolved.
2. **Transactional & Broadcast Email**:
   - **Maileroo / Resend API**:
     - Template A: `SecurityAdvisory` (Immediate risk rule updates or CVE alerts).
     - Template B: `WeeklyRiskDigest` (Summary of avalanche centrality shifts and expiring exceptions).
     - Template C: `MaintenanceNotice` (Downtime schedule and API updates).
3. **Enterprise Webhook Relays**:
   - Outgoing HMAC SHA-256 signed webhooks to Slack, Microsoft Teams, PagerDuty, or enterprise SIEMs.
   - Hardened with SSRF protection (`is_safe_webhook_url`) against internal IPs and cloud metadata endpoints.

---

## 5. Tiered B2B Pricing Architecture

| Tier | Price | Workspaces | Team Seats | Daily LLM Token Budget | Key Features & Invariants |
|---|---|---|---|---|---|
| **Community** *(Developer)* | **$0** / mo | 1 Workspace | 3 Members | 50,000 tokens / ws / day | • Northwind demo & blank slate<br>• Core Sentinel rules (R1–R8)<br>• 7-day memory retention<br>• Community Discord support |
| **Team** *(Growth)* | **$499** / mo | 3 Workspaces | 15 Members | 400,000 tokens / ws / day | • Slack & Signed Webhooks<br>• 90-day memory retention<br>• Automated Sentinel scan crons<br>• Email support (24h SLA) |
| **Enterprise** *(Scale)* | **$3,500** / mo | Unlimited | 100 Members | 2,000,000 tokens / ws / day | • Nemotron-3-Super / 3.5-Lightning on Nebius<br>• Avalanche Centrality & Expiry Storm simulations<br>• External MCP Endpoint integration<br>• SAML/SSO via Okta / Clerk<br>• 1-year memory retention<br>• Dedicated Slack channel & 4h SLA |
| **Sovereign** *(Air-Gapped)* | **$8,500** / mo | Unlimited | Unlimited | Unlimited (BYOK / On-Prem) | • VPC / On-Premise Air-gapped FalkorDB deployment<br>• Custom Cypher rule creation (R9+)<br>• Zero-Data-Retention Compliance mode<br>• SOC2 Type II audit evidence export<br>• 99.99% uptime SLA & dedicated engineering liaison |

---

## 6. Security, DDoS & Abuse Protections

1. **Sliding-Window Rate Limiting**:
   - User level: 10 chat messages / minute per user.
   - Workspace level: 50 chat messages / day per workspace (Community tier).
2. **Token Budget Breaker**:
   - `llm_daily_token_budget_per_ws: 400_000` tokens/day checked before every LLM invocation.
   - Automatic fallback to deterministic quick answers (`/chat/quick`) when quota is exceeded.
3. **Tool Execution Caps**:
   - Maximum 6 tool calls per Steward turn (`llm_max_tool_calls: 6`).
4. **SSRF Guard**:
   - Webhook destinations validated with `is_safe_webhook_url()`; private RFC-1918 subnets, loopbacks, and AWS metadata (169.254.169.254) are rejected with HTTP 400.
5. **Developer Self-Serve Erasure (GDPR Art. 17 / CCPA)**:
   - Dedicated "Purge Workspace Data & Memory" self-serve action completely wipes `org_<ws_id>` and `mem_<ws_id>` graphs, ensuring zero residual sensitive data.

---

## 7. Implementation Roadmap & Execution Gates

- [x] **Phase 1: Design Polish & Feedback Implementation**
  - Tactile Emil Kowalski press feedback (`:active { transform: scale(0.97); }`) in `globals.css` and `button.tsx`.
  - OmniDimension-style sticky MCP banner with copyable endpoint and Claude config in `mcp-banner.tsx`.
  - High-risk engineering advisory disclaimer in Steward chat interface.
- [x] **Phase 2: Data Privacy & Erasure Surface**
  - Self-serve GDPR/CCPA data purge in workspace settings.
  - Full graph cleanup (`org.drop()`, `mem.drop()`).
- [x] **Phase 3: Conversation Memory & Session History**
  - Multi-session drawer & conversation switcher in Steward UI.
  - Multi-tenant FalkorDB session isolation audit.
- [ ] **Phase 4: SuperAdmin Backend Endpoints & Platform Schema**
  - Implement `/api/v1/admin/*` router with `superadmin` Clerk role guard.
  - Add subscription tier attributes to `platform_<prefix>` workspace nodes.
- [ ] **Phase 5: SuperAdmin Web Portal**
  - Dedicated Next.js portal (`/admin`) for cross-workspace observability and user management.
