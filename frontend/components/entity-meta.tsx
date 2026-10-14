import {
  BellRing,
  BookOpen,
  ClipboardCheck,
  FileExclamationPoint,
  FileText,
  Route,
  Server,
  Shield,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NodeShape = "circle" | "diamond" | "rounded" | "hexagon" | "triangle" | "shield" | "star" | "square";

interface EntityMeta {
  label: string;
  icon: LucideIcon;
  shape: NodeShape;
  /** CSS color expression (token). */
  color: string;
}

const META: Record<string, EntityMeta> = {
  service: { label: "Service", icon: Server, shape: "circle", color: "var(--node-service)" },
  exception: { label: "Exception", icon: FileExclamationPoint, shape: "diamond", color: "var(--sev-high)" },
  person: { label: "Person", icon: UserRound, shape: "rounded", color: "var(--node-person)" },
  team: { label: "Team", icon: UsersRound, shape: "hexagon", color: "var(--node-team)" },
  control: { label: "Control", icon: ShieldCheck, shape: "triangle", color: "var(--node-control)" },
  compensatingcontrol: { label: "Compensating control", icon: Shield, shape: "shield", color: "var(--node-compensating)" },
  customerpath: { label: "Customer path", icon: Route, shape: "star", color: "var(--node-customer-path)" },
  runbook: { label: "Runbook", icon: BookOpen, shape: "square", color: "var(--node-runbook)" },
  evidence: { label: "Evidence", icon: FileText, shape: "square", color: "var(--node-runbook)" },
  alert: { label: "Alert", icon: BellRing, shape: "circle", color: "var(--sev-high)" },
  review: { label: "Review", icon: ClipboardCheck, shape: "square", color: "var(--brand)" },
};

const PREFIX: Record<string, string> = {
  svc: "service",
  exc: "exception",
  per: "person",
  team: "team",
  ctl: "control",
  cc: "compensatingcontrol",
  cp: "customerpath",
  rbk: "runbook",
  ev: "evidence",
  alt: "alert",
  rev: "review",
};

/** Normalise "CustomerPath", "customer_path", "customer-path" → "customerpath". */
export const normalizeKind = (kind: string) => kind.toLowerCase().replace(/[^a-z]/g, "");

export function entityMeta(kind: string | undefined, id?: string): EntityMeta {
  const k = kind ? normalizeKind(kind) : id ? PREFIX[id.split("_")[0]] : undefined;
  return (k && META[k]) || { label: kind ?? "Entity", icon: FileText, shape: "square", color: "var(--text-muted)" };
}

/** Route segment for an entity's detail page, when it has one. */
export function entityRoute(slug: string, kind: string, id: string): string | null {
  const k = normalizeKind(kind);
  const seg: Record<string, string> = {
    service: "services",
    exception: "exceptions",
    person: "people",
    alert: "alerts",
    review: "reviews",
  };
  return seg[k] ? `/w/${slug}/${seg[k]}/${encodeURIComponent(id)}` : null;
}
