# Reprieve Video Registry & Asset Catalog

This directory contains production-ready motion graphics films and animated walkthroughs generated for Reprieve.

All videos are generated using the **`motionmaxxing`** headless DevTools CDP rendering pipeline with deterministic frame seeking, GSAP spring physics, and ffmpeg H.264/AAC muxing.

---

## 📽️ Active Video Catalog

### 1. `reprieve-hero-showcase.mp4` (Primary Hero Showcase)
- **Designated ID:** `HERO_SHOWCASE`
- **File:** `frontend/public/videos/reprieve-hero-showcase.mp4`
- **Target Section:** Marketing Landing Page (`HeroShowreelSection`)
- **Format:** MP4 (H.264 High Profile, AAC Stereo)
- **Resolution:** 1920 × 1080 (1080p Full HD)
- **Frame Rate:** 30.00 FPS (1,201 total frames)
- **Duration:** 40.033 seconds
- **File Size:** ~2.85 MB (ultra-lightweight, web-optimized)
- **Theme / Style:** Tactile Editorial Bento (anti-slop, clean off-white `#F8F9FA`, punchy coral red `#FF4757`, sunflower yellow `#FFB800`, physical clay cards with deep soft shadows)
- **Audio:** High-energy sync soundtrack (`film/audio/soundtrack.aac`)

#### 6-Act Narrative Breakdown:
1. **Act 1: The Disconnected Stack (0:00 - 0:07)** — Four floating SaaS cards (Jira, ServiceNow, AWS IAM, Datadog) fly in from the corners with spring overshoot; a 108px crimson counter slams down with 142 unlinked waivers.
2. **Act 2: One Graph Bento (0:07 - 0:14)** — *"One Graph. Instead of twenty disconnected spreadsheets."* Vibrant 5-tile bento grid (Topology, Waivers, Ownership, Journeys, Sentinel).
3. **Act 3: Live Graph Traversal (0:14 - 0:22)** — Floating tablet viewport mockup; physical mouse cursor glides across and clicks "Checkout Path", illuminating live dependency cascade through `payments-core` to the TLS waiver.
4. **Act 4: Ghost Owner Severed (0:22 - 0:29)** — Punchy Coral Red scene (*"The owner left in August. The waiver is still live."*). Multi-stage pipeline: Orphaned Owner Priya Raman → Sentinel Autonomous Resolver (Cypher R2) → Marcus Bell (100% Accountable).
5. **Act 5: 16ms Deterministic Traversals (0:29 - 0:35)** — Sunflower Yellow clay card metric grid (16.0ms p95 latency, 5/5 planted scenarios verified, 0 false positives, 3 isolated FalkorDB graphs).
6. **Act 6: Aurora Brand Climax (0:35 - 0:40)** — 3D Aurora ring mark assembly: *"Exceptions are approved one by one. Risk compounds all at once."*

### 2. `reprieve-graph-intelligence-30s.mp4` (Internal Graph Intelligence)
- **Designated ID:** `GRAPH_INTELLIGENCE_30S`
- **File:** `frontend/public/videos/reprieve-graph-intelligence-30s.mp4` (also at `film/reprieve-graph-intelligence-30s.mp4`)
- **Target Section:** Technology / Context Engine Section (Background Loop or Interactive Explainer)
- **Format:** MP4 (H.264 High Profile, AAC Stereo)
- **Resolution:** 1920 × 1080 (1080p Full HD)
- **Frame Rate:** 30.00 FPS (900 total frames)
- **Duration:** 30.000 seconds
- **File Size:** ~3.40 MB
- **Theme / Style:** High-Density Technical HUD & Internal Graph Physics (Pure technology, zero brand marketing fluff)

#### 10-Beat Technical Breakdown:
1. **Beat 01 (0:00 - 0:03): Core Engine Boot** — Terminal execution + vector graph constellation ignition in sub-16ms cycles.
2. **Beat 02 (0:03 - 0:06): Tri-Planar Architecture** — Platform, Org domain, and Agent memory graphs isolated with zero cross-tenant leaks.
3. **Beat 03 (0:06 - 0:09): Multi-Hop Path Reasoning** — Electric traversal beam piercing 4-hop chain (`checkout-web` → `payments-core` → `token-vault` → `hsm-root`) in 1.2ms.
4. **Beat 04 (0:09 - 0:12): Avalanche Centrality Physics ($P = p_0^h$)** — Expanding shockwave with exponential blast radius calculation (85% to 72% to 61.4%).
5. **Beat 05 (0:12 - 0:15): Ghost Owner Severance** — HR departure event intercepted; unmonitored production waivers flagged in 12ms.
6. **Beat 06 (0:15 - 0:18): Sentinel Autonomous Healing** — Cypher rule engine re-anchors orphaned waivers with 100% verified audit proof.
7. **Beat 07 (0:18 - 0:21): Orchestrated Agent Swarm** — Steward core coordinates 6 orbiting satellite agents with shared episodic state.
8. **Beat 08 (0:21 - 0:24): Temporal Collision Radar** — Interference radar intercepts 3 uncoordinated security waivers colliding inside a 48h window.
9. **Beat 09 (0:24 - 0:27): Deterministic Precision Telemetry** — 16.0ms p95 latency, 100% grounded reasoning, 0% hallucinations, 5/5 CI/CD tests.
10. **Beat 10 (0:27 - 0:30): System Specifications Lockup** — Infinite vanishing horizon with pure engineering system specifications.

---

## 🚀 Planned Video Pipeline (Upcoming Generation)

| Video ID | Proposed Filename | Target Section | Planned Duration | Focus Area |
|---|---|---|---|---|
| `AVALANCHE_CENTRALITY` | `reprieve-avalanche-demo.mp4` | Graph Explorer / Risk Page | 25s | Exponential blast radius formula $P = p_0^h$ on dependency cascade |
| `GHOST_OWNER_REMEDIATION` | `reprieve-ghost-owner.mp4` | Alerts & Waivers Page | 20s | Autonomous detection and reassignment of departed staff waivers |
| `MCP_AGENT_STEWARD` | `reprieve-mcp-steward.mp4` | Architecture & API Docs | 30s | External AI agents calling Reprieve's 14 read-only graph tools via MCP |

---

## 🛠️ How to Re-render or Generate New Videos

To generate a new video using the `motionmaxxing` engine:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
node "C:\Users\sr2ma\.gemini\config\skills\motionmaxxing\scripts\render.mjs" `
  "<path-to-html-composition>" `
  "frontend/public/videos/<designated-name>.mp4" `
  --fps 30 --crf 19 --preset fast `
  --audio "film/audio/soundtrack.aac"
```
