import {
  BellRing,
  ClipboardCheck,
  FileExclamationPoint,
  LayoutDashboard,
  Network,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  /** Path segment under /w/[ws]. */
  href: string;
  icon: LucideIcon;
  /** Extra segments that keep this item active. */
  match?: string[];
  badge?: "alerts" | "reviews";
}

/** 04 §2.3 primary navigation, R0 items. */
export const PRIMARY_NAV: NavItem[] = [
  { key: "home", label: "Home", href: "home", icon: LayoutDashboard },
  { key: "alerts", label: "Alerts", href: "alerts", icon: BellRing, badge: "alerts" },
  { key: "reviews", label: "Reviews", href: "reviews", icon: ClipboardCheck, badge: "reviews" },
  { key: "exceptions", label: "Exceptions", href: "exceptions", icon: FileExclamationPoint },
  { key: "graph", label: "Graph", href: "graph", icon: Network },
  { key: "registry", label: "Registry", href: "services", icon: Server, match: ["services", "people", "teams", "controls"] },
  { key: "steward", label: "Steward", href: "steward", icon: Sparkles },
];

export const REGISTRY_NAV: NavItem[] = [
  { key: "services", label: "Services", href: "services", icon: Server },
  { key: "people", label: "People", href: "people", icon: Users },
  { key: "teams", label: "Teams", href: "teams", icon: UsersRound },
  { key: "controls", label: "Controls", href: "controls", icon: ShieldCheck },
];

export const FOOTER_NAV: NavItem[] = [
  { key: "settings", label: "Settings", href: "settings/profile", icon: Settings, match: ["settings"] },
];

export const MOBILE_NAV_KEYS = ["home", "alerts", "reviews", "steward"] as const;

/** Breadcrumb labels for path segments. */
export const SEGMENT_LABELS: Record<string, string> = {
  home: "Home",
  alerts: "Alerts",
  reviews: "Reviews",
  exceptions: "Exceptions",
  new: "New exception",
  graph: "Graph",
  services: "Services",
  people: "People",
  teams: "Teams",
  controls: "Controls",
  steward: "Steward",
  settings: "Settings",
  profile: "Profile",
  workspace: "Workspace",
  members: "Members",
  notifications: "Notifications",
  ai: "AI",
};

export function isActive(item: NavItem, segment: string | undefined) {
  if (!segment) return false;
  return segment === item.href.split("/")[0] || !!item.match?.includes(segment);
}

export const formatBadge = (n: number | undefined) => (!n ? null : n > 99 ? "99+" : String(n));
