# 06 — Implementation Plan: Reprieve

| Field | Value |
| --- | --- |
| **Product** | Reprieve — the exception debt agent |
| **Version** | 1.0 (draft for build kickoff) |
| **Date** | 2 Oct 2026 |
| **Owner** | Solo founder / developer, building with Claude Code |
| **Status** | Ready to execute |
| **Depends on** | `01-PRD.md`, `02-tech-stack.md`, `03-backend-database-schema.md`, `04-user-flow-and-screens.md`, `05-ui-ux-design-brief.md` |
| **Cross-references from other docs** | `01` §5 and §8 cite **tiers E1/E2/V1** and the R0 subset (§2 here). `02` §2 C6 and §16 and `03` header cite **spikes S-1 to S-18** (§3 here, S-9 and S-10 are the engine hazards). `04` §10 and `05` §19 cite **P6 polish** (§6 here). Keep these numbers stable. |
| **Calendar anchors** | Today: Fri 2 Oct 2026. Event: **Thu 15 Oct 00:01 to Sun 18 Oct 23:59 (GMT+5:30)**, online, about 96 hours. |

---

## 1. Purpose, constraints, and ground rules

This plan turns documents 01 to 05 into a **sequenced, testable build**: what to learn and prepare before the event, what to build hour by hour during it, how to verify each piece, how to deploy, how to submit, and what to cut if time runs short. It also lists the **Claude skills, tools, and reference repositories** to use and how.

### 1.1 Hard constraints

| # | Constraint | Consequence |
| --- | --- | --- |
| K1 | **Event rule (confirmed on the live event page):** FalkorDB must be the primary graph database and central to the product. The submission **and its main FalkorDB implementation must be new work completed during the event.** General libraries, templates, and infrastructure may be reused. | Before 15 Oct: write documents, design, and learn in a **throwaway sandbox that is never submitted**. Do **not** build the real ontology code, rule queries, seed generator, or agent code early. Re-read the **Rules** tab and ask organizers about any gray area (see §4.2). |
| K2 | **Solo developer** (three seats open), assisted by Claude Code | Strict scope tiers, vertical slices, automated checks, and a published cut ladder (§11). |
| K3 | **96-hour elapsed window** includes sleep | Plan about 55 to 65 productive hours. Phases below are elapsed time; the day blocks in §6.2 show realistic work. |
| K4 | Free tiers for the event (`02` §2: C1 FalkorDB Cloud Free, C2 Render free, C3 Vercel Hobby) | Sample data only; keep-alive; pre-warm; rehydrate path; paid tiers before real customer data. |
| K5 | FalkorDB is a Cypher **subset** (`02` C4) | Every query is written for FalkorDB and has a graph test before use. |
| K6 | Next.js 15 reaches end of support on 21 Oct 2026 (`02` C8) | Start on Next.js 16.x. |

### 1.2 Principles (from blueprint §16.1, PRD §4)

1. **Vertical slice first:** one rule end to end (database, rule, API, UI card) before breadth.
2. **Contracts before code:** Pydantic models, tool signatures, and error codes (`03` §10 to §11) are written first; stubs satisfy them.
3. **Deterministic core, probabilistic shell:** everything the demo depends on works without the LLM.
4. **Idempotent everything:** `MERGE`, deterministic IDs, reseed in under 30 seconds.
5. **Golden dataset and golden path:** one scripted end-to-end smoke run is a CI test.
6. **Main is always deployable:** `make smoke` works on `main` at all times.
7. **Pin versions, commit lockfiles, no upgrades during the event.**
8. **Feature freeze at H72.** After that, only fixes.
9. **Small commits, daily integration, one task per Claude Code session.**
10. **Measure:** ground truth and eval numbers beat adjectives.

---

## 2. Scope tiers and release mapping

### 2.1 Definitions

| Tier | Meaning | Release | Rule |
| --- | --- | --- | --- |
| **E1** | **Event must-have.** Without it the demo or the core promise fails. Matches PRD §5 R0. | R0, 18 Oct | Always built, in this order. Never cut. |
| **E2** | **Event should-have.** Strengthens the demo and the tracks; built only when its gate is on time. | R0 stretch | First to be cut (see §11). |
| **V1** | **After the event**, toward private beta (R1, Nov) and public beta (R2, Dec). | R1/R2 | Designed for; not built during the event. |

### 2.2 Feature-to-tier map

| Area | E1 (must) | E2 (should) | V1 (later) |
| --- | --- | --- | --- |
| **Marketing** | Landing page (static plus simple hero animation), Terms and Privacy placeholders, splash and cold-start state | Interactive hero mini-graph | Security page, SEO pack, consent-aware analytics |
| **Auth and workspace** | Sign-up, email verification, sign-in, reset (Clerk), workspace create, sample-data provisioning, banner, "This is me" | Workspace switcher | OAuth, invites, RBAC UI, quotas UI, workspace deletion |
| **Data model** | Full ontology for org, memory, platform graphs; deterministic seed; schema bootstrap | Bundle export | Import (CSV/JSON), rollback, API keys |
| **Detection** | **R1 to R8**, deterministic scoring with breakdown, PageRank and betweenness with degree fallback, proof path per alert, as-of evaluation, alert dedupe and auto-resolve, owner resolution chain | WCC clusters and coloring, Sentinel schedule and handoffs | Per-workspace thresholds, dry-run, rule presets |
| **Registry** | Services, people, teams, controls (read plus basic create); exceptions list, detail, create (basic) | Exception edit and activate flow, compensating controls and customer paths forms | Full edit, optimistic concurrency, evidence manager |
| **Alerts and reviews** | Alerts list and detail, propose review, review decision (renew, revoke, close, reassign, defer), in-app notifications | Acknowledge, snooze, feedback | Email notifications, bulk actions |
| **Steward** | Streaming chat with tool-only facts, citations, proof-path card, proposed-action cards, groundedness validator, tool-call cap, **quick answers** fallback | Suggested prompts by page | Session history, AI mode settings UI, private (Ollama) mode UI |
| **Memory** | `ReviewOutcome` writes and **precedent recall** | Handoff tasks, text ingestion to staged drafts with injection test | Memory browser, facts, retention jobs |
| **Graph explorer** | Canvas with filters, node drawer, **animated proof path**, List view, 500-node cap | Cmd+K entity search, cluster color | Time-travel what-if for live workspaces |
| **Time** | Simulated clock for sample workspace (persists, reruns Sentinel) | — | What-if preview |
| **Ops** | Deploy (Vercel and Render), health, keep-alive, CI, eval report, demo mode and snapshot | MCP server over the tool registry | Sentry, PostHog, paid tier migration, backups |

### 2.3 Event MVP screen set

Exactly the R0 list in `04` §10: M-01, M-03, A-01 to A-04, O-01 to O-04 and O-08, P-01 to P-07 (P-06 basic), P-09 to P-12 (P-11 teams and controls only), P-13, P-18 (profile, AI mode), notifications panel, X-01 to X-07. E2 adds P-08 (staged drafts) and the interactive hero.

---

## 3. Spikes (throwaway sandbox, run before building)

> **Purpose:** remove the highest technical risks before the clock starts. **Rules:** run in a **separate sandbox repository that is never submitted**; write findings as **text** in `docs/spike-notes.md` (commands, exact signatures, versions, results). The real implementation is written fresh during the event (K1). Each spike has a **pass criterion** and the **decision it informs**.

| ID | Spike | Pass criterion | Informs |
| --- | --- | --- | --- |
| **S-1** | Run FalkorDB in Docker; open the Browser UI | Server and Browser up; **exact image tag recorded** (never `latest`) | Pinned tag in `docker-compose.yml`, CI |
| **S-2** | Python client: sync and async connect, `select_graph`, `ro_query`, parameters, result parsing | A query returns typed rows in both modes | `graph/client.py` design |
| **S-3** | `MERGE` idempotency and `UNWIND` batch writes | Loading the same 200-row batch twice yields identical counts | Loaders, seed (`03` §6.3) |
| **S-4** | Constraints: unique and mandatory through the client; async creation polling | `ensure_schema` runs twice without error; duplicate insert is rejected | `schema.py` (C5) |
| **S-5** | Algorithms on a 25-node toy graph: `algo.pageRank`, `algo.betweenness`, `algo.WCC` | Exact call signatures and outputs documented; degree fallback also works | `detection/algorithms.py` |
| **S-6** | Shortest path: `algo.SPpaths` config map and `shortestPath()` behavior; extracting ordered nodes and edges | A proof path from a customer path to an exception returns nodes and edges in order | `detection/proof.py` |
| **S-7** | Variable-length patterns `*0..2` with `count(DISTINCT)` and `collect` | R4-style radius query returns correct counts and hop distances | Rule queries (Q-R4, Q-RAD) |
| **S-8** | Query timeouts and `ro_query` read-only enforcement | A slow query is cut off; a write through `ro_query` fails | Safety, `03` §10.7 |
| **S-9** | **Engine hazard (C6a):** fixed-length variable path with `nodes()` plus `size(relationships())` in `WHERE` | Confirm whether the pinned tag crashes; record the safe rewrite | Query style rules |
| **S-10** | **Engine hazard (C6b):** bulk writes under unique constraints | Time 500-row batches; choose batch size (default 500 or fewer) | Seed and import speed (30 s target) |
| **S-11** | Multi-graph: create and drop `platform`, `org_x`, `mem_x`; list graphs; memory per workspace | Isolation verified; memory per seeded workspace measured | Quotas (PRD Q5), provisioning |
| **S-12** | LLM: tool-calling loop with the `openai` SDK, JSON-schema outputs, streaming, token usage; same code against Ollama | One tool round-trip works for cloud and local | `agents/llm.py`, ADR-0006 |
| **S-13** | SSE end to end: `fetch-event-source` with POST, heartbeats, through Render and Vercel; CORS | Tokens stream live; no proxy buffering; reconnect works | ADR-0007 |
| **S-14** | Clerk: sign-up and email code in dev, JWKS verification in FastAPI, svix webhook; free-tier limits and deliverability | Verified user hits `/me` with a Bearer token | Auth (PRD Q3) |
| **S-15** | Frontend: Next.js 16, Tailwind v4, shadcn init, `next/font` for the three families (check the Bricolage optical-size axis), theme switch; `react-force-graph-2d` with 500 nodes and a sequenced path highlight | 60 fps pan and zoom on a mid-range laptop; both themes render | `05` §3 to §4, §12 |
| **S-16** | MCP: a minimal FastMCP tool; mount the official FalkorDB MCP server read-only | A client lists and calls both | E2 MCP task |
| **S-17** | Hello-world deploy: Render API, Vercel web, FalkorDB Cloud connection; measure cold start; keep-alive workflow | Public URLs work; cold start timed; keep-alive pings succeed | Deploy plan (§9) |
| **S-18** | Resend send test (V1, optional) | One transactional email delivered | R1 notifications |

**Spike outputs (required):** `docs/spike-notes.md` containing: pinned image tag, working Cypher snippets per procedure, forbidden patterns, measured timings, and the "Do not do" list. This file becomes the source for the project skill in §5.3.

---

## 4. Pre-event plan (P0): Fri 2 Oct to Wed 14 Oct

### 4.1 Day-by-day

| Dates | Focus | Deliverables |
| --- | --- | --- |
| **Fri 2 to Sat 3 Oct** | **Unblock decisions.** Read the **Rules**, **Overview**, and **Schedule** tabs; copy judging criteria and weights; confirm prize, dates, video cap, license, deployment expectations. Open accounts. | `docs/judging-map.md` (feature to criterion); answers to blueprint §21 questions 1 to 3; accounts created: GitHub, Vercel, Render, FalkorDB Cloud, Clerk, OpenAI, Resend, Sentry/PostHog (optional); spend limits set |
| **Sun 4 to Tue 6 Oct** | **Documentation extraction.** Split the blueprint into `docs/` files (ontology, rules, seed-spec, architecture, contracts, eval, demo) and write ADRs 0001 to 0012. Finalize documents 01 to 06 in `docs/`. | All docs committed to a **docs-only** repository (allowed) |
| **Wed 7 to Sat 10 Oct** | **Backend spikes** S-1 to S-11, S-16 in the sandbox. | `docs/spike-notes.md` (backend part) |
| **Sun 11 to Mon 12 Oct** | **Frontend and platform spikes** S-12 to S-15, S-17. | Spike notes (complete); decision on any failed spike |
| **Mon 12 to Tue 13 Oct** | **Tooling dry-run:** Claude Code setup in an empty repo (`CLAUDE.md`, subagents, commands, MCP servers, skills; §5). Rehearse the build rhythm on a trivial task. Draft the demo storyboard and a video checklist. | Working tooling config; `docs/demo.md` v1 |
| **Wed 14 Oct** | **Freeze prep.** Verify accounts, secrets, and quotas; print the cut ladder (§11); sleep early. | Checklist in §4.3 ticked |

### 4.2 What is safe to prepare before 15 Oct

| Safe | Needs organizer confirmation | Do not do before 15 Oct |
| --- | --- | --- |
| Documents, diagrams, ADRs, design tokens as a **document** (`05`) | A **generic starter** (Next.js plus shadcn plus Clerk wiring, Docker and CI boilerplate) as a public template | Ontology or schema **code**, rule queries, seed generator, scoring engine |
| Throwaway sandbox spikes (not submitted) | Reusing sandbox helper snippets | Agent, tool, or memory implementation |
| Claude Code configuration, `CLAUDE.md`, skills, hooks | | Any FalkorDB-backed product feature in the submission repo |
| Account setup, demo storyboard, video plan | | Committing sandbox code to the submission repo |

*Reason:* the rule says the main FalkorDB implementation must be new work completed during the event. When in doubt, ask in the event Discord and keep the answer in `docs/judging-map.md`.

### 4.3 Pre-event checklist

- [ ] Rules tab read; judging criteria and weights copied; video length cap, license, and deployment expectations noted
- [ ] Prize and dates verified on the live page (blueprint §3.3)
- [ ] All accounts live; API keys in a password manager; OpenAI spend limit set
- [ ] Docker, Python 3.12 with `uv`, Node LTS with `pnpm`, Ollama (optional) installed and working
- [ ] FalkorDB image tag pinned and recorded
- [ ] `docs/` complete (01 to 06, ontology, rules, seed-spec, contracts, eval, demo, ADRs, spike notes)
- [ ] Claude Code tooling configured and rehearsed (§5)
- [ ] Demo storyboard v1 and video tooling (screen recorder, mic, editor) tested
- [ ] Sleep and meal plan for the four days; notifications silenced

---

## 5. Tooling: Claude Code, skills, MCP servers, reference repositories

### 5.1 Claude Code project setup (do in the dry-run)

| Item | Purpose | Contents |
| --- | --- | --- |
| **`CLAUDE.md`** (repo root) | Permanent instructions loaded every session; keeps prompts short | Template in Appendix A |
| **`docs/`** | Source of truth the agent reads by path | Documents 01 to 06 and the extracted blueprint files |
| **`.claude/agents/`** (subagents) | Focused reviewers with their own context | `graph-reviewer` (checks Cypher against structural rules and the spike "Do not do" list), `ui-reviewer` (checks tokens, states, accessibility per `05` and `04`), `test-writer` (writes the graph and contract tests from `03` §16) |
| **`.claude/commands/`** (slash commands) | Repeatable workflows | `/slice <task-id>` (implement one backlog task with tests), `/gate <n>` (run the gate checklist), `/smoke` (run `make smoke`), `/cut` (print the cut ladder state) |
| **Hooks** | Automatic quality | After edits: `ruff`, `prettier`; before commit: tests for touched modules; block edits to `docs/` unless asked |
| **Permissions** | Safety | Allow `make`, `uv`, `pnpm`, `docker compose`, `pytest`, `git` (no force push); deny reading `.env` |

### 5.2 Skills to install and use

Skills are folders of instructions that Claude loads when relevant. Install the official set from Anthropic's skills repository (for example `npx skills add anthropics/skills`, or in Claude Code `/plugin install document-skills@anthropic-agent-skills`; the plugin command may load the whole repository, which is fine). List loaded skills with `/skills`. Verify names at kickoff.

| Skill | Use in this project | When |
| --- | --- | --- |
| **frontend-design** | Higher-quality UI code and distinctive polish. **`05` overrides its aesthetic suggestions** (our tokens, fonts, palette are fixed). | Landing, Home, Graph, ScoreRing, ProofPath |
| **webapp-testing** | Playwright-driven checks of the running app: screenshots in both themes, flows from `04`, accessibility smoke | After each screen; before gates |
| **mcp-builder** | Design the MCP server over the tool registry (E2) with correct schemas and error handling | T-047 |
| **skill-creator** | Write and test **your own project skills** (§5.3) from the spike notes | Pre-event dry-run |
| **docx / pptx / pdf** | Pitch deck, one-page summary, exportable README or whitepaper if the Rules request them | P7 (submission) |
| **doc-coauthoring** | Co-write the README, writeup, and blog post | P7 |
| **claude-api** | Only if you switch the agent from OpenAI to Claude (ADR-0006 keeps one OpenAI-compatible adapter; a Claude-compatible endpoint can be added via base URL) | Optional |
| web-artifacts-builder, theme-factory, brand-guidelines, canvas-design, algorithmic-art | **Not needed.** Skip to avoid style conflicts with `05`. | — |

### 5.3 Project skills to write (highest value)

Write these in the dry-run, from the documents, using **skill-creator**. They stop repeated mistakes and save tokens.

| Skill | Source | Contains |
| --- | --- | --- |
| **`falkordb-cypher`** | `docs/spike-notes.md`, `02` C4 to C7, `03` §6 to §7 | FalkorDB Cypher subset rules, working `algo.*` signatures, forbidden patterns (S-9, S-10), batching rules, MERGE patterns, the constraint bootstrap, "never copy Neo4j snippets" |
| **`reprieve-ui`** | `05`, `04` §7 to §8 | Token names, component specs, state patterns, motion rules, accessibility checklist, copy rules |
| **`reprieve-api-contract`** | `03` §10 to §11 | Error codes and UI map, RBAC matrix, SSE events, pagination, `If-Match` rules |
| **`reprieve-demo`** | blueprint §17, `04` §10 | Golden path steps, seeded scenario names, cached LLM outputs, reset commands |

### 5.4 MCP servers for Claude Code

| Server | Use | Notes |
| --- | --- | --- |
| **FalkorDB MCP server** (`FalkorDB/FalkorDB-MCPServer`; npm `@falkordb/mcpserver`; Docker `falkordb/mcpserver`) | **Dev-time:** let Claude Code inspect graphs, test Cypher, and list graphs while building. Supports read-only mode. | Add with `claude mcp add`, pointing `FALKORDB_HOST` and port at your local server (check its README for exact variable names). Use **read-only** by default. Optional product add-on (COULD). |
| **Playwright MCP** | Browser control for UI verification (alternative to the webapp-testing skill) | Pick one; do not run both |
| **Context7 (library docs)** | Fetch current docs for Next.js 16, Tailwind v4, shadcn, TanStack, Clerk, FastAPI | Reduces stale-API mistakes |
| **GitHub MCP** | Issues and PR workflow (optional for solo) | Optional |

### 5.5 Reference repositories (read for patterns; do not copy into the submission)

| Repository | Why read it | How to use |
| --- | --- | --- |
| `FalkorDB/FalkorDB` (and docs at docs.falkordb.com) | Cypher subset, algorithm procedures, constraints, limits | Spikes S-4 to S-11; the docs are the ground truth |
| `FalkorDB/falkordb-py` | Client API (sync and async), `ro_query`, constraint helpers | S-2 to S-4 |
| `FalkorDB/FalkorDB-MCPServer` | Reference for an MCP server over FalkorDB | S-16, T-047 |
| `getzep/graphiti` | Temporal and agent-memory ideas on FalkorDB (kept as reading reference per ADR) | Skim for memory design; do **not** adopt (custom memory subgraph is the plan) |
| FalkorDB GraphRAG-SDK | Reference only; rejected for core (`02` §4.4) | Skip unless the Rules reward it |
| `shadcn-ui/ui` | Component source and theming | Base components (`05` §7) |
| `vasturiano/react-force-graph` | Canvas graph API, link particle and highlight patterns | S-15, graph explorer |
| `modelcontextprotocol/python-sdk` | FastMCP examples | S-16 |
| `anthropics/skills` | Skill structure and the official skills | §5.2 to §5.3 |
| Clerk Next.js and FastAPI JWKS examples | Auth wiring | S-14 |

### 5.6 How to work with Claude Code (and save tokens)

1. **One task per session.** Start with the task ID: "Implement T-021 for R3 only. Read `docs/03` §7.1 and §8.1. Write the query and its graph test. Stop when the test passes."
2. **Point to documents by path and section**, never paste them. `CLAUDE.md` holds the stable rules.
3. **Plan first for risky tasks** (schema, scoring, Steward loop), then implement.
4. **Tests drive the work:** ask for the failing test first on every rule and tool.
5. **Use subagents for big reads** (reviewing a module against `03`) so the main context stays small.
6. **Clear context between tasks.** Commit, run `/clear`, start the next task.
7. **Ask for diffs and summaries**, not full file listings.
8. **Run the gate command** (`/gate n`) before moving to the next phase.
9. **Never let the LLM write Cypher at runtime**, and never let Claude Code invent a procedure signature: it must use the spike notes skill.

---

## 6. Event build plan (P1 to P7)

`H0` = Thu 15 Oct 00:01 (IST). Times below are elapsed. Gates are pass or fail.

### 6.1 Phase table

| Phase | Elapsed | Clock (IST) | Outcome | Gate (definition of done) |
| --- | --- | --- | --- | --- |
| **P1 Foundation** | H0 to H6 | Thu 00:01 to 06:00 | Repo, license, Docker, CI skeleton, pinned FalkorDB, schema bootstrap, deterministic seed loader, graph visible in Browser, **hello-world deployed** (Render plus Vercel) | **Gate A:** `make up && make seed` gives expected counts (Northwind Pay: 8 teams, 40 people, 25 services, 60 exceptions); both deploys reachable |
| **P2 Vertical slice** | H6 to H18 | Thu 06:00 to 18:00 | **R2 (Ghost Owner) end to end:** query, alert, API, Home card, Alert detail with proof path; Clerk sign-in; sample provisioning | **Gate B:** one alert visible in the deployed UI behind sign-in; unit and graph tests green |
| **P3 Detection depth** | H18 to H36 | Thu 18:00 to Fri 12:00 | R1 and R3 to R8, algorithms with fallback, scoring, proof paths, alert dedupe and auto-resolve, owner resolution, Sentinel run, risk endpoints, Home overview, Alerts list | **Gate C:** eval shows **5/5 recall, 0 false positives**, scores calibrated (S1 services critical, 3 control services low), p95 rule query under 200 ms |
| **P4 Agents** | H36 to H54 | Fri 12:00 to Sat 06:00 | Tool registry, Steward loop with groundedness validator, chat SSE, proposed actions, reviews (propose, decide, effects), notifications, Graph explorer with animated proof path | **Gate D:** golden-path answers cite node IDs; groundedness check passes in CI; review decision writes graph effects atomically |
| **P5 Memory and extras** | H54 to H66 | Sat 06:00 to 18:00 | `ReviewOutcome` and **precedent recall** (E1); E2 items as time allows: text ingestion with injection test, handoffs, MCP server | **Gate E:** precedent recalled in a **new session**; injection test passes if ingestion is built |
| **P6 Polish** | H66 to H72 | Sat 18:00 to Sun 00:01 | Splash and cold-start states, empty and error states, responsive pass, accessibility pass, landing page, coach marks if time, final copy (microcopy per `05` §16), illustrations | **Gate F (FEATURE FREEZE at H72, Sun 18 Oct 00:01):** `make smoke` passes; Playwright plus `axe` clean on main screens in both themes |
| **P7 Ship** | H72 to H90 | Sun 00:01 to 18:00 | Final deploy and smoke, demo mode recordings, README (criteria-mapped), video, blog, eval report, submission form | **Gate G:** submitted by about **18:00**, with all checklist items (§12) done |
| **Buffer** | H90 to H96 | Sun 18:00 to 23:59 | Late fixes only, resubmit if needed | — |

### 6.2 Realistic day blocks (solo, with sleep)

| Day | Working blocks | Target |
| --- | --- | --- |
| **Thu 15 Oct** | 00:01 to 03:00 (setup burst), 08:00 to 23:00 | P1 and P2 done; vertical slice live by evening |
| **Fri 16 Oct** | 08:00 to 24:00 | P3 complete; start P4 (tools, Steward) |
| **Sat 17 Oct** | 08:00 to 24:00 | P4 complete; P5 (memory); begin P6 |
| **Sun 18 Oct** | 00:01 freeze; 08:00 to 18:00 ship; buffer to 23:59 | P6 finished early morning, P7 submit by 18:00 |

If a phase runs more than **3 hours late**, trigger the next step of the cut ladder (§11) immediately.

---

## 7. Work breakdown (backlog)

IDs are used in commits, Claude Code prompts, and gates. **DoD** = definition of done. FR references point to `01` §8.

### 7.1 WS0 Repository, tooling, deploy

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-001 | Init monorepo per `02` §6; OSI license (confirm choice, for example MIT or Apache-2.0); `CLAUDE.md`; `.env.example` | E1 | — | Repo public; structure matches `02` §6 |
| T-002 | `docker-compose.yml` (pinned FalkorDB, API, web), `Makefile` (`up seed test eval demo reset`) | E1 | T-001 | `make up` runs everything on a clean machine |
| T-003 | CI: ruff, mypy, eslint, tsc, pytest with FalkorDB service container, seed smoke | E1 | T-002 | PR checks green |
| T-004 | **Hello-world deploy** (Render API with `/health`, Vercel web, FalkorDB Cloud) | E1 | T-002 | Public URLs respond; cold start measured |
| T-005 | Scheduled workflows: `sentinel-tick.yml` (15 min), `keepalive.yml` (12 h) | E1 | T-004 | Workflows succeed and appear in Actions |

### 7.2 WS1 Graph and data

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-010 | `graph/client.py`: connection, **single graph-name builder** from validated workspace ID | E1 | T-002 | Unit test: invalid IDs rejected |
| T-011 | `graph/schema.py`: `ensure_schema` for platform, org, memory graphs (idempotent, polling constraints) | E1 | T-010 | Runs twice cleanly; duplicate insert rejected (`03` §6.2 to §6.3) |
| T-012 | `graph/repo.py` base: typed read and write functions, `ro_query` for reads, 500-row batches | E1 | T-011 | Only module touching FalkorDB (import-lint) |
| T-013 | Deterministic seed generator (`generate_seed.py`, fixed random seed) and `ground_truth.json` for S1 to S5 plus 3 healthy services | E1 | blueprint §15 | Same hash on every run; counts match spec |
| T-014 | Loaders (`MERGE`) and `seed_graph.py` | E1 | T-012, T-013 | Reseed under 30 s; idempotent |
| T-015 | Sample provisioning service (create graphs, schema, defaults, sample dataset, Sentinel) with progress events | E1 | T-014 | Under 30 s end to end (`FR-ONB-02`) |
| T-016 | `dump_graph.sh`, `demo_reset.py`, restore path | E1 | T-014 | Snapshot and restore verified |

### 7.3 WS2 Detection engine

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-020 | **R2 vertical slice:** `.cypher` query, rule loader, graph test (Q-R2, Q-OWN) | E1 | T-014 | Test passes on fixture |
| T-021 | R1, R3, R4, R5, R6, R7, R8 queries and tests (one file per intent) | E1 | T-020 | Each row of `03` §16 passes |
| T-022 | `algorithms.py`: PageRank, betweenness, WCC wrappers; **degree-centrality fallback** | E1 (WCC: E2) | S-5 notes | Fallback triggers on procedure failure (test) |
| T-023 | `scoring.py` with YAML config; per-exception breakdown | E1 | T-021, T-022 | Golden calibration: S1 services critical, controls low (`03` §8.4) |
| T-024 | `proof.py`: minimal node and edge path for every alert | E1 | T-021 | Every alert stores a path (`FR-DET-12`) |
| T-025 | `engine.run_all(as_of)`: alert upsert by fingerprint, auto-resolve, reopen | E1 | T-023, T-024 | Second run creates **zero** new alerts |
| T-026 | Sentinel run: lock, `RiskSnapshot`, `dirty` handling, run record | E1 | T-025 | Concurrent runs are safe |
| T-027 | Owner resolution fallback chain (`03` §9.2) with reason codes | E1 | T-020 | 100% on seeded org changes |

### 7.4 WS3 API, auth, workflows

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-030 | FastAPI skeleton, RFC 7807 errors, request IDs, health endpoints | E1 | T-001 | Error shape matches `03` §10.6 |
| T-031 | Clerk JWT verification, membership dependency (404 on non-member), RBAC dependencies | E1 | T-030, S-14 | Tenancy test: user A to workspace B returns 404 on every router |
| T-032 | `/me`, workspaces, onboarding state, link-person, clock (PUT triggers Sentinel) | E1 | T-031, T-015 | Flows `04` FLOW-01 and FLOW-08 work |
| T-033 | Risk, alerts, graph, proof-path, search endpoints | E1 | T-025 | Contract tests green |
| T-034 | Exceptions list, detail, create, lifecycle (draft, activate) | E1 basic / E2 full | T-012 | Field-level validation; derived effective status |
| T-035 | Reviews: propose (ranked assignees), confirm (atomic effects per `03` §9.1), cancel | E1 | T-027 | Failure leaves review pending and retry-safe |
| T-036 | Workspace SSE `/events` (alerts, reviews, sentinel, clock, provisioning) | E1 | T-026 | UI updates without reload |
| T-037 | In-app notifications | E1 | T-035 | Review assigned and critical alert create notifications |
| T-038 | Rate limits and quotas (minimal) | E2 | T-030 | `RATE_LIMITED` and `QUOTA_EXCEEDED` paths tested |

### 7.5 WS4 Agents and memory

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-040 | `agents/llm.py`: one adapter, retries, fallback hop, JSON-schema helper, in-process response cache | E1 | S-12 | Contract tests pass with a stub provider |
| T-041 | `agents/tools.py`: registry with Pydantic I/O (`03` §12.1); reads only, writes staged | E1 | T-033 | Contract tests with stub LLM |
| T-042 | Steward loop: 6-call cap, per-turn timeout, `guard.py` groundedness validator | E1 | T-040, T-041 | Uncited or unknown IDs removed; CI test |
| T-043 | Chat SSE (`/chat/sessions/{id}/messages`) with events from `03` §10.4 | E1 | T-042 | Streams tokens, tool steps, proof path, final |
| T-044 | `memory/store.py` and `precedent.py`: `ReviewOutcome` on every decision; precedent lookup by control and service | E1 | T-035 | New session recalls prior outcome |
| T-045 | **Quick answers** (no LLM): risk ranking, owner lookup | E1 | T-033 | Works when AI is off or down |
| T-046 | Text ingestion: extractor (no tools), resolver, staged drafts, approve and reject | E2 | T-040 | Hostile line ignored; nothing active without approval |
| T-047 | Sentinel to Steward `HandoffTask` and visible list | E2 | T-026, T-042 | Handoff created on new high alert |
| T-048 | MCP server over the tool registry (Streamable HTTP) | E2 | T-041, mcp-builder skill | Client lists and calls tools; no raw writes |
| T-049 | Cached AI alert summaries with deterministic fallback text | E2 | T-040 | Alert page shows text with AI off |

### 7.6 WS5 Frontend

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-050 | Next.js 16 app, **tokens (`05` §3.6)**, fonts, `next-themes`, shadcn base components | E1 | S-15 | Both themes render; no raw hex lint |
| T-051 | App shell: rail, top bar, as-of chip, Sentinel pill, entity drawer, Steward panel frame, command palette (E2 search) | E1 | T-050 | Matches `04` §3 |
| T-052 | `lib/api.ts`, `lib/sse.ts`, TanStack Query setup, Clerk integration, error-code UI map | E1 | T-031 | `04` §7 error map implemented |
| T-053 | Landing page and splash and cold-start states | E1 | T-050 | LCP under 2.5 s; hero static first, interactive in E2 |
| T-054 | Auth screens, email verification, onboarding (O-01 to O-04, O-08) | E1 | T-052, T-032 | FLOW-01 passes in under 3 minutes |
| T-055 | Home: metric strip, ranked services with **ScoreRing**, selected panel, Expiry Runway, attention feed | E1 | T-033 | `04` SCR-P-01 states done |
| T-056 | **Graph explorer:** canvas, filters, drawer, List view, **proof-path animation**, 500 cap | E1 | S-15, T-033 | Reduced-motion variant; table alternative |
| T-057 | Alerts list and Alert detail (why, proof, breakdown, precedent, actions) | E1 | T-033 | SCR-P-03 and P-04 |
| T-058 | Reviews inbox, detail, **DecisionDialog** with effects summary | E1 | T-035 | FLOW-04 passes |
| T-059 | Exceptions list, detail, create (basic) | E1 | T-034 | SCR-P-05 to P-07 |
| T-060 | Steward page and panel: streaming, citation chips, proof-path card, action cards, degraded mode | E1 | T-043, T-045 | FLOW-07 passes |
| T-061 | Registry: services, people, teams, controls (read plus basic create) | E1 | T-012 | SCR-P-09 to P-11 |
| T-062 | Settings (profile, AI mode), notifications panel | E1 | T-037 | SCR-P-18 subset |
| T-063 | Empty, loading, error, and conflict states pass across screens | E1 | all screens | `04` §7 checklist |
| T-064 | Responsive pass (360, 768, 1440) | E1 | T-063 | `04` §9 |
| T-065 | Accessibility pass (axe, keyboard, reduced motion) | E1 | T-064 | `05` §15 checklist |
| T-066 | Interactive hero mini-graph, staged drafts screen (P-08), cluster color, Cmd+K search | E2 | — | As specified |

### 7.7 WS6 Testing, evaluation, ship

| ID | Task | Tier | Depends | DoD |
| --- | --- | --- | --- | --- |
| T-070 | Graph tests for every named query (`03` §16 matrix) | E1 | each query | CI green |
| T-071 | `eval/run_eval.py`: recall, false positives, groundedness, owner accuracy, latency; `eval/report.md` | E1 | T-025, T-042 | Targets in §8.2 met |
| T-072 | E2E smoke test of the critical path (`httpx` plus Playwright): provision sample, top risk, alert, review decision, precedent | E1 | T-060 | Runs in CI and via `make smoke` |
| T-073 | Playwright plus axe on main screens, both themes | E1 | T-065 | Zero serious violations |
| T-074 | Injection and tenancy tests | E1 (injection E2 if ingestion cut) | T-031 | Pass |
| T-080 | README (criteria-mapped skeleton, Appendix C of blueprint) | E1 | all | Quickstart works in under 5 minutes |
| T-081 | Demo video (3 minutes or the Rules cap) | E1 | Gate F | Recorded against the production deployment |
| T-082 | Final deploy and post-deploy smoke (health, deep health, sample provision, critical-path smoke) | E1 | Gate F | All green on production URLs |
| T-083 | Blog post | E2 | T-080 | Published (side prize) |
| T-084 | Submission form and checklist (§12) | E1 | T-080 to T-082 | Submitted before 18:00 |
| T-085 | Snapshot and cached-response backup; offline fallback instructions | E1 | T-016, T-040 | Restore tested |

---

## 8. Testing and evaluation plan

### 8.1 Layers

| Layer | What | Tool | Run |
| --- | --- | --- | --- |
| Unit | Scoring, owner resolution, schema validation, groundedness validator | `pytest` | Every PR |
| Graph | Each named query on a tiny fixture graph (`03` §16) | `pytest` plus FalkorDB service container | Every PR |
| Contract | Tool and API I/O against Pydantic models; stub LLM | `pytest`, `respx` | Every PR |
| Tenancy and security | User A to workspace B returns 404 everywhere; injection fixture; RBAC matrix | `pytest` | Every PR |
| Frontend unit | Components and hooks | Vitest, Testing Library | Every PR |
| E2E and visual | Golden path; screens in both themes at 360, 768, 1440 | Playwright (+ `axe`) | PR smoke; full before gates |
| Eval | Recall, false positives, groundedness, latency | `eval/run_eval.py` | Before each gate; report in README |

### 8.2 Targets (from PRD §10 and blueprint §5)

| Metric | Target |
| --- | --- |
| Recall on planted scenarios (S1 to S5) | **5 of 5** |
| False positives on 3 healthy control services | **0** |
| Answer groundedness (claims backed by returned node IDs) | **100%** in automated check |
| Owner-resolution accuracy on seeded org changes | **100%** |
| p95 rule query latency (seed graph) | under **200 ms** (measure and report) |
| Full Sentinel run on the 25-service seed | under **3 s** |
| Sample provisioning | under **30 s** |
| Cold-start demo reset | under **30 s** |
| Sign-up to first proof path | under **3 minutes** |
| Axe serious or critical violations | **0** on main screens |

---

## 9. Environments, deployment, and operations

### 9.1 Environments

| Env | FalkorDB | API | Web | Data |
| --- | --- | --- | --- | --- |
| Local | Docker (pinned tag) | `uvicorn` | `next dev` | Seed |
| CI | Service container | test app | Playwright against build | Fixtures and seed |
| **Event (prod)** | FalkorDB Cloud **Free** | Render free web service | Vercel Hobby | **Synthetic only** (K4, C1) |
| Beta (V1) | FalkorDB Cloud paid (TLS, backups) | Render paid instance | Vercel Pro | Real data allowed after C1 mitigation |

### 9.2 Deployment steps (P1 and P7)

1. Create Render service (Docker or native Python), set env vars from `.env.example`; configure `/health`.
2. Create Vercel project (root `frontend/`), set `NEXT_PUBLIC_API_URL` and Clerk keys.
3. Set CORS on the API for the Vercel domains; verify SSE (S-13).
4. Add GitHub secrets: `INTERNAL_TICK_SECRET`, `API_URL`; enable `sentinel-tick.yml` and `keepalive.yml`.
5. Post-deploy smoke script: health, deep health, sample provision, critical-path smoke (T-082).

### 9.3 Operations runbook (event)

| Situation | Action |
| --- | --- |
| Render cold start | Landing pre-warm; warm manually 10 minutes before the demo; keep-alive every 12 h plus a manual ping |
| FalkorDB Cloud instance stopped or data lost (C1) | `WORKSPACE_DATA_MISSING` path: re-provision sample or restore snapshot (`scripts/dump_graph.sh` plus restore) |
| LLM outage or latency | Quick answers, fallback model via `COMPAT_*` |
| Bad deploy | Re-deploy previous Render and Vercel builds; schema changes are additive |
| Quota or spend | OpenAI spend limit; daily token budget per workspace |

---

## 10. Definition of done

**Per task:** code merged; tests added and green; lint and types clean; docs or contract updated if behavior changed; one-line entry in `CHANGELOG`.
**Per screen:** matches its spec in `04`; all four states (loading, empty, error, degraded); both themes; 360 and 1440 px; keyboard path; `axe` clean; copy per `05` §16; traces to an `FR-*` requirement; design QA checklist in `05` §18 ticked.
**Per rule or tool:** named parameterized query; graph test on fixture; documented in `docs/rules.md` or `docs/contracts.md`; proof path or citation returned.
**Per release (R0):** Gates A to G passed; `make smoke` passes on `main`; eval report published; README quickstart verified on a clean machine.

---

## 11. Risk-controlled schedule: cut ladder and contingencies

### 11.1 Never cut (core promise)

Graph-driven detection R1 to R8 with scoring, **proof path**, **citations with groundedness check**, owner resolution, review decision with graph effects, **precedent recall**, simulated clock, deployment, README, video.

### 11.2 Cut ladder (in order, when a phase is more than 3 hours late)

| Step | Cut | Replacement |
| --- | --- | --- |
| 1 | Interactive hero and heavy animation (T-066) | Static hero; keep proof-path animation |
| 2 | Cmd+K search, cluster color, WCC | Plain list search |
| 3 | MCP server (T-048) | Mention as roadmap |
| 4 | Sentinel handoffs and scheduler (T-047, T-005 tick) | Manual **Run Sentinel** button and clock apply |
| 5 | Text ingestion (T-046) and P-08 | Pre-staged draft shown in demo; roadmap |
| 6 | Notifications panel, settings subset | Reviews inbox only |
| 7 | Exception create form beyond basic | Seeded data only |
| 8 | Registry write forms | Read-only registry |

### 11.3 Solo fallback (from blueprint §16.4)

Cut to E1 plus the clock; one agent (Steward) with Sentinel as a function; no ingestion; no multi-workspace switcher.

### 11.4 Schedule risk controls

| Risk | Control |
| --- | --- |
| Algorithm syntax surprises | Spikes S-5, S-6; degree fallback; Python fallback for scoring if needed |
| Free-tier data loss | Keep-alive; snapshot and rehydrate; synthetic data only |
| LLM failure | Fallback provider, quick answers |
| Scope creep | Parking-lot file `docs/parking-lot.md`; new ideas go there |
| Solo burnout | Fixed sleep blocks (§6.2); no new work after freeze |
| Late deploy surprises | Hello-world deploy at H6; production smoke test at P7 start |
| Rules misread | Judging map and Rules notes completed in P0 |

---

## 12. Submission pack (P7)

| Item | Detail | Owner task |
| --- | --- | --- |
| Public repository | OSI license, clean history, no secrets, docs folder included | T-001, T-084 |
| **README** | One-line pitch and GIF; problem and why graphs; **track mapping** (Company Brain primary, Agent Memory and Coordination secondary); what FalkorDB does (schema, named queries, algorithms, multi-graph); architecture diagram; 5-minute quickstart; demo walkthrough; **eval results**; judging-criteria map; limitations and roadmap; credits | T-080 |
| Demo video | 3 minutes or the cap in Rules; follows the storyboard in `04` §10; recorded against production | T-081 |
| Deployment | Live web and API URLs; hosted FalkorDB; local run instructions as backup | T-082 |
| Project information form | Completed with links | T-084 |
| FalkorDB centrality proof | Screenshots of Browser with `org_` and `mem_` graphs, a rule query, an algorithm call | T-080 |
| Blog post | Side prize (best posts) | T-083 |
| Judging map | Copied from the live Overview page into the README | P0 |

**Demo script (3 minutes):** see `04` §10 for the beat-to-screen mapping (problem, riskiest service with proof path, Ghost Owner and review, text capture or staged draft, clock to Quiet Expiry Week, precedent in a new session, eval numbers and roadmap).

---

## 13. After the event: roadmap to private and public beta

| Release | Target | Work (tier V1) |
| --- | --- | --- |
| **R1 Private beta (v0.5)** | Nov 2026 | CSV and JSON import with rollback; invites and RBAC UI; settings; email notifications (Resend); audit log; rule configuration and presets; full text ingestion; paid FalkorDB tier with TLS and backups; Render paid instance; Sentry |
| **R2 Public beta (v1.0)** | Dec 2026 | API keys and MCP endpoint; bundle export; what-if time travel; quotas and usage UI; security page; PostHog with consent; hardening, pen-test checklist, accessibility audit; Vercel Pro |
| **Future (2027)** | | Connectors (Jira, Slack, Okta, ServiceNow), SSO, saved views, bulk actions, Slack/Teams notifications, billing |

---

## 14. Open items and assumptions

| # | Item | Needed by | Resolved by |
| --- | --- | --- | --- |
| 1 | Judging criteria, weights, video cap, license, deployment rules, prize and dates | 3 Oct | Rules, Overview, Schedule tabs; `docs/judging-map.md` |
| 2 | Organizer confirmation on a generic starter template before the event | 10 Oct | Event Discord |
| 3 | Final OpenAI model names; local model for Ollama; whether to also offer Claude via the OpenAI-compatible adapter | 12 Oct | S-12 |
| 4 | OSI license choice | 14 Oct | Founder |
| 5 | Final logo mark and illustration set | 17 Oct (P6) | `05` §19 |
| 6 | Team seats (three open) | Before 15 Oct | Founder; plan assumes solo |
| 7 | Domain and final product name | After event | Founder |
| 8 | Clerk free-tier limits, email deliverability, Resend limits | S-14, S-18 | Spikes |
| 9 | Free-tier quotas after measuring memory per workspace | S-11 | Spike |

---

## Appendix A: `CLAUDE.md` template

```markdown
# Reprieve — instructions for Claude Code

## What this is
Graph-first exception-risk product. FalkorDB is central. Docs in /docs (01 PRD, 02 tech, 03 schema/API, 04 flows, 05 design, 06 plan). Read the relevant section by path; do not ask me to paste it.

## Hard rules
1. The LLM never writes Cypher. Only named, parameterized queries in backend/app/graph/queries/*.cypher.
2. Only graph/repo.py talks to FalkorDB. detection/ never imports agents/ and never calls an LLM.
3. Labels and relationship types come from code constants, never user input. Build graph names with the single helper.
4. Writes only through repository functions; every state change is human-approved and audited.
5. FalkorDB is a Cypher SUBSET. Follow the falkordb-cypher skill. Never copy Neo4j snippets. Batch writes <= 500 rows.
6. UI: use tokens from frontend/styles/globals.css (05 §3). No raw hex. Every screen has loading/empty/error/degraded states. Severity never by color alone.
7. Timestamps are epoch seconds (UTC). `expired` is derived, not stored.
8. Pin versions. Do not upgrade dependencies.

## Workflow
- One task per session, by ID from docs/06 §7. Write the failing test first. Stop when it passes and lint/types are clean.
- Run `make test` before saying done. Use `/gate n` at phase ends.
- If a FalkorDB procedure signature is unknown, check docs/spike-notes.md; do not guess.
- New ideas go to docs/parking-lot.md, not into code.

## Commands
make up | seed | test | eval | smoke | reset
```

## Appendix B: Makefile targets

```
up      # docker compose up falkordb api web
seed    # generate + load seed graph (idempotent)
test    # unit + graph + contract + tenancy
eval    # run eval harness, write eval/report.md
smoke   # reset, seed, run end-to-end smoke
reset   # drop graphs, reseed
```

## Appendix C: GitHub Actions skeletons (pin tags from S-1)

```yaml
# .github/workflows/ci.yml (essentials)
name: ci
on: [pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      falkordb:
        image: falkordb/falkordb:<PINNED_TAG>
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: cd backend && uv sync --frozen && uv run ruff check . && uv run mypy app && uv run pytest -q
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: cd frontend && pnpm i --frozen-lockfile && pnpm lint && pnpm tsc --noEmit && pnpm test
```

```yaml
# .github/workflows/sentinel-tick.yml
name: sentinel-tick
on: { schedule: [{ cron: "*/15 * * * *" }], workflow_dispatch: {} }
jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -X POST "$API_URL/internal/sentinel/tick" -H "X-Internal-Secret: $INTERNAL_SECRET"
        env: { API_URL: "${{ secrets.API_URL }}", INTERNAL_SECRET: "${{ secrets.INTERNAL_TICK_SECRET }}" }
```

```yaml
# .github/workflows/keepalive.yml
name: keepalive
on: { schedule: [{ cron: "0 */12 * * *" }], workflow_dispatch: {} }
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS "$API_URL/health" && curl -fsS "$API_URL/internal/health/deep" -H "X-Internal-Secret: $INTERNAL_SECRET"
        env: { API_URL: "${{ secrets.API_URL }}", INTERNAL_SECRET: "${{ secrets.INTERNAL_TICK_SECRET }}" }
```

## Appendix D: First Claude Code prompts (event day)

1. "Read `docs/02` §6 and §7 and `docs/06` T-001 to T-003. Create the monorepo skeleton, docker-compose with the pinned FalkorDB tag from `docs/spike-notes.md`, the Makefile, and CI. Stop when `make up` works."
2. "Implement T-010 and T-011 from `docs/03` §6. Write the tests first. Use the falkordb-cypher skill."
3. "Implement T-013: deterministic seed generator for Northwind Pay per `docs/blueprint.md` §15 and the ground truth file. Output must hash identically on every run."
4. "Implement T-020 (R2 vertical slice) end to end: query, test, repo function, API route, and a Home alert card. Show me the diff summary only."
5. "Run `/gate 1` and report failures only."
