# 00 — Decisions log (overrides 01–06 where they conflict)

| Date | Decision |
| --- | --- |
| 2 Oct 2026 | **Real product, not a demo.** Demo-only mechanisms were removed from the docs: `DEMO_MODE` / recorded LLM cassettes, `make demo`, "golden path" framing. Replacements: `make smoke` (end-to-end smoke of the critical path), in-process LLM response cache, Quick answers and fallback provider for LLM outages. The sample workspace ("Northwind Pay") stays: it is an onboarding feature (FR-ONB-02). |
| 2 Oct 2026 | **Build starts now** (before the 15 Oct event window), at the owner's direction, overriding the sequencing in `06` §4 (K1). |
| 2 Oct 2026 | **No blueprint exists.** The seed specification that `06` T-013 attributes to "blueprint §15" is defined in `07-seed-spec.md`. |

| 2 Oct 2026 | **UI libraries (owner's choice), on top of shadcn/ui:** GSAP (scroll and sequence animation; now free incl. plugins, so 02 §4.1's licensing objection no longer applies), Lenis (smooth scroll, marketing pages only, never inside app scroll containers), React Bits (copy-in components via the shadcn registry), LottieFiles (`@lottiefiles/dotlottie-react` for empty states and illustrations). Each is added when the first component needs it; `prefers-reduced-motion` disables all of them. `motion` stays for small UI transitions. |
| 2 Oct 2026 | **Repository:** GitHub `fncreator22/Reprieve-full-stack` is the main repository. Local root checkout `/Users/sst/conductor/repos/wemakedevs-hackathon` (`main`) is kept fast-forwarded to the working branch; pushing waits for collaborator access. |

## Fixes applied to the documents

| # | Doc | Problem | Resolution |
| --- | --- | --- | --- |
| F1 | 03 §6.2 | `id` constraints on every label, but `RuleConfig`, `SchemaMeta`, `Ref` have no `id` | Excluded; they use `rule_id` / `key` |
| F2 | 03 §7.3 | Q-PRE declared `$control_id/$service_id` but used `$control_key/$service_key` | Params renamed |
| F3 | 03 §7.3 | Q-ALT-UP: new alerts started at version 2; snoozed alerts never reopened | Increment moved to `ON MATCH`; snoozed reopens when `snoozed_until <= $as_of` |
| F4 | 03 §12.2 | Groundedness regex anchored `^…$` could not find IDs inside text | Word-boundary regex |
| F5 | 03 §4, 04 §5.3 | Onboarding steps 1–2 happen before the workspace exists, but state lived on the Workspace | Client sends path + name in `POST /workspaces`; server state starts at `identity` |
| F6 | 03 §9/§10, 04 FLOW-04 | `/reviews/{id}/confirm` meant both "confirm assignment" and "decide" | Human-created reviews start `pending`; Steward proposals start `draft` → `POST /submit`; decision is `POST /decide` |
| F7 | 03 §10.1 | Undefined which clock drives snooze/defer/expiry | Domain comparisons use `as_of` (workspace clock); record timestamps use real `now` |
| F8 | 03 §6.2, §12.3 | Mandatory `expires_at` vs staged drafts without expiry | Missing expiry defaults to granted + 30 d and is flagged |
| F9 | 03 §7.2 | Q-R8P `ORDER BY length(p)` + `RETURN p` fails on the pinned engine (spike) | Sort in `WITH`, return ID and type lists |
| F10 | 03 §12.2 | Tool cap counted LLM rounds, PRD counts tool calls | Counts tool calls |
| F11 | 04 §5.4 | Expiry Runway used an endpoint that cannot group by team | New `GET /risk/runway` backed by Q-DASH-RUNWAY |
| F12 | 02/06 | Secret named `INTERNAL_TICK_SECRET` and `INTERNAL_SECRET` | `INTERNAL_TICK_SECRET` everywhere, header `X-Internal-Secret` |
| F13 | 02 §3.3 | Next.js 16 renamed `middleware.ts` to `proxy.ts` | Clerk route gating lives in `proxy.ts` |
| F14 | 02 §4.3 | Unpinned FalkorDB tag | `v4.22.0` (see `spike-notes.md`) |
| F15 | 03 §6.2, §7.3 | MANDATORY constraints are enforced when `MERGE` creates the node, before `SET`/`ON CREATE SET` run (spike), so mandatory non-key properties make upserts impossible, and Q-ALT-UP's `MERGE` on `fingerprint` violates mandatory `id` | MANDATORY only on merge keys (`id`, `Ref.key`); other required fields are validated by Pydantic. Alert IDs are deterministic: `alt_` + first 24 hex chars of the fingerprint hash, and Q-ALT-UP merges on `id` |
| F16 | 03 §8.1 | R8 fingerprint `R8\|path\|exc` opens one alert per (customer path, exception): ~60 alerts on the sample, which is alert fatigue | One R8 alert per customer path (`R8\|path_id`), `involved` = every reachable exception, severity from the most severe one. R4 and R8 proofs show the 5 strongest paths (`PROOF_CAP`) |
| F17 | 03 §11, §12.2 | Steward was to emit `StewardAnswer` as JSON with its own `citations`; trusting model-reported citations weakens groundedness and streams poorly | Steward writes markdown citing node IDs inline (`svc_…`). The server builds `StewardAnswer`: citations = IDs present in this turn's tool results; sentences citing unknown IDs are removed and counted in `removed_claims` |
| F18 | 03 §12.1 | `acknowledge_alert` / `approve_draft_exception` action types had no tool | R0 ships `create_review` proposals only; the others arrive with text ingestion (E2) |

## Defaults chosen where the docs were silent or contradictory

| Topic | Default |
| --- | --- |
| AI mode in R0 | R0 ships a simple AI mode select (cloud / off) in Settings: 04 and 06 §2.3 list it in R0, 06 §2.2 put it in V1. `private` arrives with the Ollama work in R1. |
| Workspace in URLs | Frontend routes use the slug (`/w/acme`); the API uses `ws_id`; the client maps slug → id from `GET /me` memberships. |
| Pagination | Cursor-based "Load more" everywhere (05 §7.4 page numbers dropped). |
| Email verification | Enforced by Clerk at sign-up. The API reads `email`/`email_verified` from session-token claims when present; otherwise it loads the primary email and its verification status from Clerk's Backend API with `CLERK_SECRET_KEY` (cached 5 min). JWKS also comes from the Backend API when `CLERK_JWKS_URL` is unset. Unverified → `EMAIL_NOT_VERIFIED`. |
| Review deciders | R0: assigned reviewer (role reviewer+) or admin. FLOW-05's "team lead decides" assumes the lead's linked user has reviewer role; revisit with RBAC UI in R1. |
| Render free hours | A 15-minute tick keeps the free instance awake (~744 of 750 h/month); acceptable, move to a paid instance before public beta. |
| Seed data generation | Python stdlib `random.Random(seed)` with curated name lists (no `faker` dependency). |
