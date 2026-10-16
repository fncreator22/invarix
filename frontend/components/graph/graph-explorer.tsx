"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import { Database, List, Network, Play, Plus, RotateCcw, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TemporalSlider } from "@/components/graph/temporal-slider";
import { SimulationProofCard } from "@/components/graph/simulation-proof-card";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useMediaQuery, usePrefersReducedMotion, useSimulationForecast, useThemeTokens } from "@/lib/hooks";
import { drawShape } from "@/lib/graph-draw";
import type { ThemeTokens } from "@/lib/tokens";
import type { AvalancheCentralityItem, GraphOut, TemporalCollisionItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

// Canvas module loads whole on the client (its ForceGraph ref needs a direct import).
const GraphCanvas = dynamic(() => import("@/components/graph/graph-canvas"), { ssr: false });

const KINDS = ["Service", "Exception", "Person", "Team", "Control", "CompensatingControl", "CustomerPath", "Runbook"] as const;
const KIND_LABEL: Record<string, string> = { CompensatingControl: "Compensating control", CustomerPath: "Customer path" };
const HOP_MS = 90; // 05 §12.2 --dur-path

import type { GLink, GNode } from "@/components/graph/graph-canvas"; // types only
const idOf = (v: string | GNode) => (typeof v === "string" ? v : v.id);

/** SCR-P-02: force graph with filters, animated proof path, and an accessible list view. */
export function GraphExplorer() {
  const api = useApi();
  const { wsId, slug } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useEntityDrawer();
  const tokens = useThemeTokens();
  const reduced = usePrefersReducedMotion();
  const mobile = useMediaQuery("(max-width: 639px)");
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [progress, setProgress] = useState(1);
  const [horizonDays, setHorizonDays] = useState(0);
  const [selectedProofNode, setSelectedProofNode] = useState<{
    avalancheItem?: AvalancheCentralityItem | null;
    collisionItem?: TemporalCollisionItem | null;
  } | null>(null);

  const focus = params.get("focus");
  const view = params.get("view") ?? (mobile ? "list" : "canvas");
  const kinds = params.get("kinds")?.split(",") ?? [...KINDS];
  const pathIds = useMemo(() => params.get("path")?.split(",").filter(Boolean) ?? [], [params]);
  const pathSet = useMemo(() => new Set(pathIds), [pathIds]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const graph = useQuery({
    queryKey: ["graph", wsId, focus, kinds.join(",")],
    queryFn: ({ signal }) => api<GraphOut>(wsPath(wsId, "/graph"), { signal, query: { focus: focus ?? undefined, depth: 2, kinds: kinds.join(",") } }),
  });

  const forecast = useSimulationForecast(wsId, horizonDays, focus);
  const qc = useQueryClient();
  const loadSample = useMutation({
    mutationFn: () => api<unknown>(wsPath(wsId, "/load-sample"), { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["graph", wsId] });
      void qc.invalidateQueries({ queryKey: ["workspace", wsId] });
      void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
      toast.success("Loaded Northwind Pay demo data. Rendering canvas...");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const data = useMemo(() => {
    if (!graph.data) return { nodes: [] as GNode[], links: [] as GLink[] };
    return { nodes: graph.data.nodes.map((n) => ({ ...n })), links: graph.data.edges.map((e) => ({ source: e.from, target: e.to, type: e.type })) };
  }, [graph.data]);

  // Path edges in path order, so the draw-in follows the chain (05 §12.3 proof path draw).
  const pathLinks = useMemo(
    () =>
      data.links
        .filter((l) => pathSet.has(idOf(l.source)) && pathSet.has(idOf(l.target)))
        .sort((a, b) => pathIds.indexOf(idOf(a.source)) - pathIds.indexOf(idOf(b.source))),
    [data.links, pathIds, pathSet],
  );

  useEffect(() => {
    const state = { value: 1 };
    if (!pathLinks.length || reduced) return;
    state.value = 0;
    const raf = requestAnimationFrame(() => setProgress(0)); // hide the path until it draws in
    const tween = gsap.to(state, {
      value: 1,
      duration: (pathLinks.length * HOP_MS) / 1000 + 0.5,
      ease: "power1.inOut",
      delay: 0.6, // let the layout settle first
      onUpdate: () => setProgress(state.value),
    });
    return () => {
      cancelAnimationFrame(raf);
      tween.kill();
    };
  }, [pathLinks, reduced]);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [view, graph.isPending]); // the box mounts only after data loads

  const pathActive = pathSet.size > 0;

  const handleSelectDecoration = (nodeId: string) => {
    const avItem = forecast.data?.avalanche_centrality?.find((a) => a.service_id === nodeId) ?? null;
    const colItem = forecast.data?.temporal_collisions?.find((c) => c.affected_services.includes(nodeId) || c.cluster_id === nodeId) ?? null;
    if (avItem || colItem) {
      setSelectedProofNode({ avalancheItem: avItem, collisionItem: colItem });
    }
  };

  const handleSimulateOutage = () => {
    setHorizonDays(30);
    const avItem = forecast.data?.avalanche_centrality?.find((a) => a.service_id === "svc_payments_gateway") ?? null;
    const cascadePath = avItem?.proof?.nodes?.length
      ? avItem.proof.nodes
      : ["svc_payments_gateway", "svc_checkout_api", "svc_mobile_api"];

    const next = new URLSearchParams(params.toString());
    next.set("focus", "svc_payments_gateway");
    next.set("path", cascadePath.join(","));
    next.set("horizon", "30");
    router.replace(`${pathname}?${next}`, { scroll: false });

    if (avItem) {
      setSelectedProofNode({ avalancheItem: avItem, collisionItem: null });
    }

    toast.info("30-Day Cascade Horizon Active", {
      description: "payments-gateway exception expires at +30d. Cascading dependency path highlighted on canvas.",
      duration: 5000,
    });
  };

  useEffect(() => {
    if (params.get("sim") === "1" || params.get("horizon") === "30") {
      queueMicrotask(() => {
        setHorizonDays(30);
      });
      const avItem = forecast.data?.avalanche_centrality?.find((a) => a.service_id === "svc_payments_gateway") ?? null;
      const cascadePath = avItem?.proof?.nodes?.length
        ? avItem.proof.nodes
        : ["svc_payments_gateway", "svc_checkout_api", "svc_mobile_api"];

      if (!params.get("path")) {
        const next = new URLSearchParams(params.toString());
        next.set("focus", "svc_payments_gateway");
        next.set("path", cascadePath.join(","));
        router.replace(`${pathname}?${next}`, { scroll: false });
      }

      if (avItem && !selectedProofNode) {
        queueMicrotask(() => {
          setSelectedProofNode({ avalancheItem: avItem, collisionItem: null });
        });
      }
    }
  }, [params, forecast.data, selectedProofNode, pathname, router]);

  useEffect(() => {
    if (horizonDays === 30 && focus === "svc_payments_gateway" && forecast.data && !selectedProofNode) {
      const avItem = forecast.data.avalanche_centrality?.find((a) => a.service_id === "svc_payments_gateway") ?? null;
      const colItem = forecast.data.temporal_collisions?.[0] ?? null;
      if (avItem || colItem) {
        queueMicrotask(() => {
          setSelectedProofNode({ avalancheItem: avItem, collisionItem: colItem });
        });
      }
    }
  }, [horizonDays, focus, forecast.data, selectedProofNode]);

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[520px] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-2">
        <h1 className="mr-2 font-display text-h2 font-semibold">Graph</h1>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Node types">
          {KINDS.map((k) => {
            const on = kinds.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setParam("kinds", (on ? kinds.filter((x) => x !== k) : [...kinds, k]).join(",") || KINDS[0])}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-caption",
                  on ? "border-brand bg-brand-soft text-text-primary" : "border-border-subtle text-text-muted",
                )}
              >
                {KIND_LABEL[k] ?? k}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data.nodes.some((n) => n.id === "svc_payments_gateway") && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSimulateOutage}
              className="gap-1.5 font-medium text-caption h-8"
            >
              <Play className="size-3 fill-current" />
              <span>Simulate 30d horizon</span>
            </Button>
          )}
          {(focus || pathActive) && (
            <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
              <RotateCcw aria-hidden /> Reset focus
            </Button>
          )}
          <div className="flex items-center rounded-md border border-border-subtle bg-bg-surface p-0.5 shadow-xs" role="tablist" aria-label="Graph display mode">
            <button
              type="button"
              role="tab"
              aria-selected={view === "canvas"}
              onClick={() => setParam("view", "canvas")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-caption font-medium transition-colors",
                view === "canvas"
                  ? "bg-brand text-text-on-brand shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle",
              )}
              title="2D Interactive Physics Canvas: drag nodes, scroll to zoom, inspect dependency paths & risk halos"
            >
              <Network className="size-3.5" aria-hidden />
              <span>Canvas (Graph)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setParam("view", "list")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-caption font-medium transition-colors",
                view === "list"
                  ? "bg-brand text-text-on-brand shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle",
              )}
              title="Structured table list view of entities and relations"
            >
              <List className="size-3.5" aria-hidden />
              <span>List (Table)</span>
            </button>
          </div>
        </div>
      </div>

      {graph.data?.truncated && (
        <p className="bg-sev-moderate-soft px-4 py-1.5 text-body-sm">Showing {graph.data.total} nodes. Filter by type or open a node to focus.</p>
      )}

      {graph.isPending ? (
        <Skeleton className="m-4 flex-1" />
      ) : graph.isError ? (
        <p className="p-6 text-text-secondary">{errorMessage(graph.error)}</p>
      ) : !data.nodes.length ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          <EmptyState
            illustration
            title="Graph canvas is empty"
            description="The 2D Force-Directed Canvas visualizes microservice dependencies, architectural waivers, cascading risk halos, and shortest proof paths. Because this workspace has no services or exceptions yet, there are no graph nodes to render."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <Link href={`/w/${slug}/services`}>
                    <Plus aria-hidden /> Add your first service
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => loadSample.mutate()}
                  loading={loadSample.isPending}
                >
                  <Database aria-hidden /> Load Northwind Pay demo to explore Canvas
                </Button>
              </div>
            }
          />
          <div className="card-e1 max-w-xl w-full mt-6 p-5 space-y-3 text-left">
            <h4 className="font-semibold text-body-sm text-text-primary flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              What the Canvas view provides once data is loaded:
            </h4>
            <ul className="text-body-sm text-text-secondary space-y-2 list-disc list-inside">
              <li>
                <strong>Interactive Physics Simulation:</strong> Force-directed layout where microservices and waivers spring back when dragged.
              </li>
              <li>
                <strong>Temporal Risk Forecasting:</strong> Slide through +7d, +30d, and +90d using the temporal scrubber to preview cascading failures.
              </li>
              <li>
                <strong>Causal Proof Paths:</strong> Trace the shortest paths between skipped tests, security waivers, and payments services.
              </li>
              <li>
                <strong>Automated Code Scanning:</strong> Run <code className="font-mono text-caption bg-surface-subtle px-1.5 py-0.5 rounded border border-border-subtle">invarix scan .</code> in your codebase to attach your services automatically.
              </li>
            </ul>
          </div>
        </div>
      )
 : view === "list" ? (
        <GraphList graph={graph.data} onOpen={open} pathSet={pathSet} />
      ) : (
        <div ref={box} className="relative flex-1 overflow-hidden" aria-label={`Graph of ${data.nodes.length} nodes. Use the List view for a text version.`} role="img">
          <div className="absolute top-3 left-3 z-10 w-[calc(100%-1.5rem)] max-w-md sm:max-w-lg lg:max-w-xl pointer-events-auto">
            <TemporalSlider
              horizonDays={horizonDays}
              onHorizonChange={setHorizonDays}
              forecast={forecast.data}
              isLoading={forecast.isPending}
            />
          </div>
          {tokens && (
            <GraphCanvas
              data={data}
              tokens={tokens}
              size={size}
              pathLinks={pathLinks}
              pathSet={pathSet}
              progress={pathLinks.length && !reduced ? progress : 1}
              focus={focus}
              still={reduced}
              decorations={forecast.data?.canvas_decorations}
              onOpen={open}
              onSelectDecoration={handleSelectDecoration}
            />
          )}
          <SimulationProofCard
            avalancheItem={selectedProofNode?.avalancheItem}
            collisionItem={selectedProofNode?.collisionItem}
            onClose={() => setSelectedProofNode(null)}
            onAskSteward={(question) => router.push(`/w/${slug}/steward?q=${encodeURIComponent(question)}`)}
          />
          <Legend tokens={tokens} />
        </div>
      )}
    </div>
  );
}

function Legend({ tokens }: { tokens: ThemeTokens | null }) {
  if (!tokens) return null;
  return (
    <ul className="glass absolute bottom-3 left-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border-subtle p-3 text-caption" aria-label="Legend">
      {KINDS.map((k) => (
        <li key={k} className="flex items-center gap-2">
          <canvas
            width={14}
            height={14}
            aria-hidden
            ref={(c) => {
              const ctx = c?.getContext("2d");
              if (!ctx) return;
              ctx.clearRect(0, 0, 14, 14);
              drawShape(ctx, k, 7, 7, 5);
              ctx.fillStyle = k === "Exception" ? tokens.severity.high : (tokens.node[k as keyof ThemeTokens["node"]] ?? tokens.textMuted);
              ctx.fill();
            }}
          />
          {KIND_LABEL[k] ?? k}
        </li>
      ))}
    </ul>
  );
}

/** Required accessible alternative to the canvas (PRD §9). */
function GraphList({ graph, onOpen, pathSet }: { graph: GraphOut; onOpen: (id: string) => void; pathSet: Set<string> }) {
  const name = Object.fromEntries(graph.nodes.map((n) => [n.id, n.name]));
  return (
    <div className="grid flex-1 gap-6 overflow-auto p-4 lg:grid-cols-2">
      <table className="w-full text-body-sm">
        <caption className="mb-2 text-left font-medium">Nodes ({graph.nodes.length})</caption>
        <thead className="text-left text-text-muted">
          <tr>
            <th className="py-1 font-medium">Name</th>
            <th className="py-1 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {graph.nodes.map((n) => (
            <tr key={n.id} className={cn("border-t border-border-subtle", pathSet.has(n.id) && "bg-proof-soft")}>
              <td className="py-1.5">
                <button type="button" onClick={() => onOpen(n.id)} className="text-left hover:underline">
                  {n.name}
                </button>
              </td>
              <td className="py-1.5 text-text-secondary">{KIND_LABEL[n.label] ?? n.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full text-body-sm">
        <caption className="mb-2 text-left font-medium">Relationships ({graph.edges.length})</caption>
        <tbody>
          {graph.edges.map((e, i) => (
            <tr key={i} className="border-t border-border-subtle">
              <td className="py-1.5">{name[e.from]}</td>
              <td className="py-1.5 text-text-muted">{e.type.toLowerCase().replace(/_/g, " ")}</td>
              <td className="py-1.5">{name[e.to]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
