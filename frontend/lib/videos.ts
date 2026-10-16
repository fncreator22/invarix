export interface ProductVideoAct {
  act: number;
  title: string;
  timing: string;
  summary: string;
}

export interface ProductVideo {
  id: string;
  name: string;
  filename: string;
  path: string;
  durationSeconds: number;
  fps: number;
  resolution: string;
  theme: "editorial-bento" | "tactile-light" | "clay-metric";
  title: string;
  subtitle: string;
  targetSection: string;
  acts: ProductVideoAct[];
}

/**
 * INVARIX Central Video Registry
 * Catalog of generated product films and showreels for use across the platform.
 */
export const INVARIX_VIDEOS: Record<string, ProductVideo> = {
  HERO_SHOWCASE: {
    id: "hero-showcase",
    name: "INVARIX Hero Bento Showcase",
    filename: "invarix-hero-showcase.mp4",
    path: "/videos/invarix-hero-showcase.mp4",
    durationSeconds: 40.03,
    fps: 30,
    resolution: "1920x1080",
    theme: "editorial-bento",
    title: "INVARIX — Exceptions Scattered Everywhere",
    subtitle: "40-Second Dynamic Bento Product Film",
    targetSection: "Marketing Landing Page Hero Showreel",
    acts: [
      {
        act: 1,
        title: "The Disconnected Stack",
        timing: "0:00 - 0:07",
        summary: "Four floating SaaS cards (Jira, ServiceNow, AWS IAM, Datadog) fly in; 142 unlinked waivers counter slams down.",
      },
      {
        act: 2,
        title: "One Graph Bento",
        timing: "0:07 - 0:14",
        summary: "Vibrant tactile 5-tile bento grid springs in with FalkorDB property graph topology.",
      },
      {
        act: 3,
        title: "Live Tablet Traversal",
        timing: "0:14 - 0:22",
        summary: "Physical cursor glides across tablet mockup, clicking Checkout Path to beam multi-hop cascade.",
      },
      {
        act: 4,
        title: "Ghost Owner Warning",
        timing: "0:22 - 0:29",
        summary: "Punchy Coral Red (#FF4757) scene showing Priya Raman -> Sentinel Resolver -> Marcus Bell.",
      },
      {
        act: 5,
        title: "Deterministic Speed",
        timing: "0:29 - 0:35",
        summary: "Sunflower Yellow (#FFB800) clay metrics: 16ms latency, 5/5 verified rules, 0 false positives.",
      },
      {
        act: 6,
        title: "Aurora Brand Finale",
        timing: "0:35 - 0:40",
        summary: "3D Aurora ring mark assembly with signature tagline: Exceptions approved one by one, risk compounds all at once.",
      },
    ],
  },
  GRAPH_INTELLIGENCE_30S: {
    id: "graph-intelligence-30s",
    name: "INVARIX Graph Intelligence (30s Technical Deep-Dive)",
    filename: "invarix-graph-intelligence-30s.mp4",
    path: "/videos/invarix-graph-intelligence-30s.mp4",
    durationSeconds: 30.0,
    fps: 30,
    resolution: "1920x1080",
    theme: "tactile-light",
    title: "INVARIX — Internal Graph Intelligence & Autonomous Reasoning",
    subtitle: "30-Second High-Velocity Technical Deep-Dive Film",
    targetSection: "Technology / Context Engine Section (Background Loop or Interactive Explainer)",
    acts: [
      { act: 1, title: "FalkorDB Core Engine Boot", timing: "0:00 - 0:03", summary: "High-concurrency graph compilation and node lattice ignition in sub-16ms cycles." },
      { act: 2, title: "Tri-Planar Graph Architecture", timing: "0:03 - 0:06", summary: "Platform, domain, and agent memory graphs isolated with zero cross-tenant leaks." },
      { act: 3, title: "Multi-Hop Path Reasoning", timing: "0:06 - 0:09", summary: "Electric traversal beam piercing 4-hop chain from Checkout to critical HSM Vault in 1.2ms." },
      { act: 4, title: "Avalanche Centrality (P = p₀ʰ)", timing: "0:09 - 0:12", summary: "Physics of cascading blast radius: 85% to 72% to 61.4% failure propagation." },
      { act: 5, title: "Ghost Owner Anomaly Severance", timing: "0:12 - 0:15", summary: "HR departure event intercepted; unmonitored production waivers flagged in 12ms." },
      { act: 6, title: "Sentinel Autonomous Self-Healing", timing: "0:15 - 0:18", summary: "Cypher rule engine re-anchors orphaned waivers with 100% verified audit proof." },
      { act: 7, title: "Orchestrated Multi-Agent Swarm", timing: "0:18 - 0:21", summary: "Steward core coordinates 6 orbiting satellite agents with shared episodic state." },
      { act: 8, title: "Temporal Collision Radar", timing: "0:21 - 0:24", summary: "Interference radar intercepts 3 uncoordinated security waivers colliding inside a 48h window." },
      { act: 9, title: "Deterministic Precision Telemetry", timing: "0:24 - 0:27", summary: "16.0ms p95 latency, 100% grounded reasoning, 0% hallucinations, 5/5 CI/CD tests." },
      { act: 10, title: "System Specifications Lockup", timing: "0:27 - 0:30", summary: "Infinite vanishing horizon with pure engineering system specifications." },
    ],
  },
};
