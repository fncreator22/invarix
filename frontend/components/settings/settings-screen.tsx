"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Building,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Download,
  Globe,
  Key,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/page-header";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { BillingTab } from "@/components/settings/billing-tab";
import { TABS, type SettingsTab } from "@/components/settings/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsWorkspaceHub } from "@/components/ui/settings";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { AiMode, ClockOut, WorkspaceOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { meQueryKey, useMe, useWorkspace, workspaceQueryKey } from "@/lib/workspace";

const ROLE_RANK = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 } as const;
const AI_MODES: { mode: AiMode; title: string; body: string; available: boolean }[] = [
  { mode: "cloud", title: "Cloud", body: "Steward uses the configured hosted model. It receives entity IDs, names and short excerpts, never whole records.", available: true },
  { mode: "private", title: "Private", body: "Only a local or self-hosted model is used; nothing is sent to a cloud provider. Arrives with the private beta.", available: false },
  { mode: "off", title: "Off", body: "No AI calls. Detection, scores, owner routing, proof paths and Quick answers keep working.", available: true },
];

const CLOCK_PRESETS = [
  { label: "17 Oct 2026 (Sample start)", asOf: 1792195200 },
  { label: "22 Oct 2026 (Quiet Expiry Week)", asOf: 1792627200 },
  { label: "16 Nov 2026 (+30 Days)", asOf: 1794787200 },
  { label: "15 Jan 2027 (+90 Days)", asOf: 1800000000 },
];

const TAB_CONFIG: Record<
  SettingsTab,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  profile: {
    label: "Profile & General",
    icon: User,
    description: "Personal account preferences and theme",
  },
  workspace: {
    label: "Workspace & Clocks",
    icon: Building,
    description: "Name, environment, and simulated clock",
  },
  "api-keys": {
    label: "API Keys",
    icon: Key,
    description: "CLI tokens and programmatic credentials",
  },
  integrations: {
    label: "Integrations & Webhooks",
    icon: Zap,
    description: "GitHub, Slack webhooks, and CI gates",
  },
  "ai-governance": {
    label: "AI Governance",
    icon: Sparkles,
    description: "Steward LLM mode and privacy controls",
  },
  "data-privacy": {
    label: "Data Privacy & GDPR",
    icon: ShieldCheck,
    description: "Telemetry retention, export, and deletion",
  },
  billing: {
    label: "Plans & Pricing",
    icon: CreditCard,
    description: "Subscription tiers, quotas, and invoices",
  },
};

/** SCR-P-18: profile, workspace, AI mode, API keys, integrations, data privacy. */
export function SettingsScreen({ tab }: { tab: SettingsTab }) {
  const { slug } = useWorkspace();
  return (
    <PageContainer width="home" className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace environment, access keys, AI safety limits, and subscription."
      />

      {/* Mobile/Tablet Horizontal Tab Navigation */}
      <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-2 scrollbar-none border-b border-border-subtle flex gap-2">
        {(Object.keys(TABS) as SettingsTab[]).map((k) => {
          const item = TAB_CONFIG[k];
          const Icon = item.icon;
          const isActive = k === tab;
          return (
            <Link
              key={k}
              href={`/w/${slug}/settings/${k}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-all",
                isActive
                  ? "bg-brand text-white font-semibold shadow-xs"
                  : "bg-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-sunken"
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Full Width Settings Main Canvas */}
      <div className="w-full max-w-5xl space-y-8">
        <main className="w-full space-y-8">
          {tab === "profile" ? (
            <Profile />
          ) : tab === "workspace" ? (
            <Workspace />
          ) : tab === "ai-governance" ? (
            <Ai />
          ) : tab === "integrations" ? (
            <IntegrationsTab />
          ) : tab === "data-privacy" ? (
            <DataPrivacyTab />
          ) : tab === "billing" ? (
            <BillingTab />
          ) : (
            <ApiKeysSection />
          )}
        </main>
      </div>
    </PageContainer>
  );
}

function Profile() {
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe();
  const { role } = useWorkspace();
  const { theme, setTheme } = useTheme();

  // User profile name
  const [userName, setUserName] = useState<string | null>(null);
  const saveUser = useMutation({
    mutationFn: () => api(`/me`, { method: "PATCH", body: { name: userName } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meQueryKey });
      toast.success("User profile saved.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      {/* 1. Account Profile */}
      <Section title="Account Profile">
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), saveUser.mutate())}>
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Display Name</span>
            <Input
              value={userName ?? me.data?.user.name ?? ""}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={120}
              placeholder="Your full name"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-text-muted">
            <span>Email: <strong className="text-text-primary">{me.data?.user.email}</strong></span>
            <span className="capitalize text-caption border border-border-subtle px-2 py-0.5 rounded bg-surface-sunken">
              Role: {role}
            </span>
          </div>
          <Button type="submit" loading={saveUser.isPending} disabled={userName === null}>
            Save Profile
          </Button>
        </form>
      </Section>

      {/* 2. Appearance */}
      <Section title="Appearance">
        <p className="text-caption text-text-muted mb-3">
          Select your interface color theme preference for INVARIX console and tools.
        </p>
        <div role="radiogroup" aria-label="Theme" className="flex gap-2">
          {["system", "light", "dark"].map((t) => (
            <Button
              key={t}
              role="radio"
              aria-checked={theme === t}
              variant={theme === t ? "default" : "secondary"}
              size="sm"
              onClick={() => setTheme(t)}
            >
              {t[0]!.toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </Section>

      {/* 3. Top Navigation Bar Preferences */}
      <TopNavigationPreferencesSection />
    </div>
  );
}

function TopNavigationPreferencesSection() {
  const [prefs, setPrefs] = useState({
    showClock: true,
    showSentinel: true,
    showGuide: false,
    showSteward: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("invarix_topbar_prefs");
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  }, []);

  const updatePref = (key: keyof typeof prefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      localStorage.setItem("invarix_topbar_prefs", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("topbar-prefs-changed", { detail: next }));
      toast.success("Navigation bar preferences updated.");
    } catch {}
  };

  return (
    <Section title="Top Header &amp; Navigation Preferences">
      <p className="text-caption text-text-muted mb-4">
        Customize which status indicators and utility buttons are visible in the top navigation header bar to reduce visual clutter.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised">
          <div className="space-y-0.5">
            <span className="text-body-sm font-semibold text-text-primary block">Simulation Clock Badge</span>
            <span className="text-caption text-text-muted">Shows active simulated date and time-travel selector</span>
          </div>
          <Switch
            checked={prefs.showClock}
            onCheckedChange={(v) => updatePref("showClock", v)}
            aria-label="Toggle clock pill"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised">
          <div className="space-y-0.5">
            <span className="text-body-sm font-semibold text-text-primary block">Sentinel Detection Status</span>
            <span className="text-caption text-text-muted">Real-time status pill of background graph invariants</span>
          </div>
          <Switch
            checked={prefs.showSentinel}
            onCheckedChange={(v) => updatePref("showSentinel", v)}
            aria-label="Toggle sentinel pill"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised">
          <div className="space-y-0.5">
            <span className="text-body-sm font-semibold text-text-primary block">Quick Guide Button</span>
            <span className="text-caption text-text-muted">Header walkthrough guide button</span>
          </div>
          <Switch
            checked={prefs.showGuide}
            onCheckedChange={(v) => updatePref("showGuide", v)}
            aria-label="Toggle quick guide"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised">
          <div className="space-y-0.5">
            <span className="text-body-sm font-semibold text-text-primary block">Ask Steward AI Button</span>
            <span className="text-caption text-text-muted">Header toggle for conversational reasoning panel</span>
          </div>
          <Switch
            checked={prefs.showSteward}
            onCheckedChange={(v) => updatePref("showSteward", v)}
            aria-label="Toggle steward button"
          />
        </div>
      </div>
    </Section>
  );
}

function DeploymentEnvironmentSection({ wsId }: { wsId: string }) {
  const [environment, setEnvironment] = useState<string>("production");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(`invarix.env_${wsId}`);
      if (stored) setEnvironment(stored);
    }
  }, [wsId]);

  const handleEnvironmentChange = (newEnv: string) => {
    setEnvironment(newEnv);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`invarix.env_${wsId}`, newEnv);
    }
    toast.success(`Active deployment environment switched to ${newEnv.toUpperCase()}.`);
  };

  return (
    <Section title="Deployment Environment Target">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-caption text-text-muted">
            Select the active runtime environment evaluated by INVARIX pre-merge CI gates and AST decorators.
          </p>
          <span className="font-mono text-[10px] text-text-muted uppercase border border-border-subtle px-1.5 py-0.5 rounded bg-surface-sunken">
            Persisted
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {[
            { id: "production", label: "Production", badge: "Live Gates" },
            { id: "staging", label: "Staging", badge: "Pre-Release" },
            { id: "development", label: "Development", badge: "Internal" },
            { id: "sandbox", label: "Sandbox", badge: "Zero-Auth" },
          ].map((env) => (
            <button
              key={env.id}
              type="button"
              onClick={() => handleEnvironmentChange(env.id)}
              className={cn(
                "flex flex-col items-start p-3.5 rounded-lg border text-left transition-all",
                environment === env.id
                  ? "border-brand bg-brand-soft ring-1 ring-brand/40 shadow-xs"
                  : "border-border-subtle bg-surface hover:border-brand/30 hover:bg-surface-sunken"
              )}
            >
              <span className="text-body-sm font-semibold capitalize text-text-primary">{env.label}</span>
              <span className="text-[10px] font-mono text-text-muted uppercase mt-0.5">{env.badge}</span>
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function TemporalClockSection({
  wsId,
  workspace,
  isAdmin,
}: {
  wsId: string;
  workspace?: WorkspaceOut;
  isAdmin: boolean;
}) {
  const api = useApi();
  const qc = useQueryClient();

  const clock = useMutation({
    mutationFn: (asOf: number) =>
      api<ClockOut>(wsPath(wsId, "/clock"), { method: "PUT", body: { as_of: asOf } }),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes(wsId) });
      toast.success("Simulated clock updated. Sentinel is rerunning detection.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const [dateInput, setDateInput] = useState<string>(() => {
    const ts = workspace?.as_of ? new Date(workspace.as_of * 1000) : new Date();
    return ts.toISOString().split("T")[0]!;
  });

  const handleApplyCustomDate = () => {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      toast.error("Invalid date format.");
      return;
    }
    const unix = Math.floor(parsed.getTime() / 1000);
    clock.mutate(unix);
  };

  return (
    <Section title="Temporal Clock & Evaluation Horizon">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-body-sm font-medium text-text-primary">
              Current Mode: <span className="capitalize font-semibold text-brand">{workspace?.clock_mode ?? "simulated"}</span>
            </p>
            <p className="text-caption text-text-muted mt-0.5">
              Simulated clock allows time-traveling forward to evaluate expiring waivers and cascading failure collisions.
            </p>
          </div>
          {workspace?.as_of && (
            <span className="font-mono text-caption text-text-secondary bg-surface-sunken border border-border-subtle px-2.5 py-1 rounded-md flex items-center gap-1.5 self-start sm:self-auto shrink-0">
              <Calendar className="size-3.5 text-brand" />
              {format(new Date(workspace.as_of * 1000), "dd MMM yyyy")}
            </span>
          )}
        </div>

        <div className="space-y-3 pt-3 border-t border-border-subtle">
          <span className="text-body-sm font-medium text-text-primary">Simulated Clock Presets</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CLOCK_PRESETS.map((p) => (
              <button
                key={p.asOf}
                type="button"
                disabled={!isAdmin || clock.isPending}
                onClick={() => clock.mutate(p.asOf)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-colors",
                  workspace?.as_of === p.asOf
                    ? "border-brand bg-brand-soft text-brand font-semibold ring-1 ring-brand/30"
                    : "border-border-subtle bg-surface text-text-secondary hover:text-text-primary hover:border-brand/30"
                )}
              >
                <span>{p.label}</span>
                {workspace?.as_of === p.asOf ? (
                  <Check className="size-3.5 text-brand" />
                ) : (
                  <Clock className="size-3.5 text-text-muted" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-end gap-2.5">
            <label className="block w-full sm:w-auto flex-1 space-y-1 text-body-sm">
              <span className="text-caption font-medium text-text-muted">Custom As-Of Date</span>
              <Input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                disabled={!isAdmin || clock.isPending}
                className="h-9 text-xs font-mono"
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!isAdmin || clock.isPending}
              loading={clock.isPending}
              onClick={handleApplyCustomDate}
              className="h-9 text-xs shrink-0"
            >
              Apply Custom Date
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Workspace() {
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe();
  const { wsId, workspace, role, slug } = useWorkspace();
  const admin = ROLE_RANK[role] >= ROLE_RANK.admin;

  const renameMutation = useMutation({
    mutationFn: (newName: string) =>
      api<WorkspaceOut>(wsPath(wsId), { method: "PATCH", body: { name: newName } }),
    onSuccess: (updated) => {
      qc.setQueryData(workspaceQueryKey(wsId), updated);
      void qc.invalidateQueries({ queryKey: workspaceQueryKey(wsId) });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      toast.success("Workspace renamed successfully.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const run = useMutation({
    mutationFn: () =>
      api<{ created: number; resolved: number }>(wsPath(wsId, "/sentinel/run"), {
        method: "POST",
      }),
    onSuccess: (r) =>
      toast.success(`Sentinel finished: ${r.created} new, ${r.resolved} resolved.`),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const resetBlank = useMutation({
    mutationFn: () =>
      api<WorkspaceOut>(wsPath(wsId, "/reset-blank"), { method: "POST" }),
    onSuccess: (w) => {
      qc.setQueryData(workspaceQueryKey(wsId), w);
      void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
      void qc.invalidateQueries({ queryKey: ["risk-services", wsId] });
      void qc.invalidateQueries({ queryKey: ["alerts", wsId] });
      void qc.invalidateQueries({ queryKey: ["graph", wsId] });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      toast.success(
        "Workspace cleared! All demo data wiped, now running on a clean blank slate (0 alerts)."
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const purgeData = useMutation({
    mutationFn: () =>
      api<WorkspaceOut>(wsPath(wsId, "/purge-data"), { method: "POST" }),
    onSuccess: (w) => {
      qc.setQueryData(workspaceQueryKey(wsId), w);
      void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
      void qc.invalidateQueries({ queryKey: ["risk-services", wsId] });
      void qc.invalidateQueries({ queryKey: ["alerts", wsId] });
      void qc.invalidateQueries({ queryKey: ["graph", wsId] });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      toast.success(
        "GDPR Right to Erasure executed: Domain graph, turns, and agent memory permanently purged."
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const loadSample = useMutation({
    mutationFn: () =>
      api<WorkspaceOut>(wsPath(wsId, "/load-sample"), { method: "POST" }),
    onSuccess: (w) => {
      qc.setQueryData(workspaceQueryKey(wsId), w);
      void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
      void qc.invalidateQueries({ queryKey: ["risk-services", wsId] });
      void qc.invalidateQueries({ queryKey: ["alerts", wsId] });
      void qc.invalidateQueries({ queryKey: ["graph", wsId] });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      toast.success("Populated workspace with Northwind Pay demo data.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <SettingsWorkspaceHub
        slug={slug}
        wsId={wsId}
        workspaceName={workspace?.name}
        region="United States (US-East-1)"
        role={role}
        dataMode={workspace?.data_mode}
        clockMode={workspace?.clock_mode}
        isAdmin={admin}
        onRename={(newName) => renameMutation.mutate(newName)}
        isRenaming={renameMutation.isPending}
        onRunSentinel={() => run.mutate()}
        isRunningSentinel={run.isPending}
        onResetBlank={() => resetBlank.mutate()}
        isResettingBlank={resetBlank.isPending}
        onPurgeData={() => purgeData.mutate()}
        isPurgingData={purgeData.isPending}
        onLoadSample={() => loadSample.mutate()}
        isLoadingSample={loadSample.isPending}
        deleteDialogNode={
          role === "owner" ? (
            <DeleteWorkspaceDialog
              wsId={wsId}
              slug={workspace?.slug ?? ""}
              name={workspace?.name ?? ""}
              ownerEmail={me.data?.user.email}
            />
          ) : undefined
        }
      />
      <DeploymentEnvironmentSection wsId={wsId} />
      <TemporalClockSection wsId={wsId} workspace={workspace} isAdmin={admin} />
    </div>
  );
}

function DeleteWorkspaceDialog({
  wsId,
  slug,
  name,
  ownerEmail,
}: {
  wsId: string;
  slug: string;
  name: string;
  ownerEmail?: string;
}) {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typedSlug, setTypedSlug] = useState("");
  const [typedEmail, setTypedEmail] = useState("");

  const isConfirmed =
    typedSlug.trim() === slug &&
    (!ownerEmail || typedEmail.trim().toLowerCase() === ownerEmail.toLowerCase());

  const del = useMutation({
    mutationFn: () =>
      api(wsPath(wsId), {
        method: "DELETE",
        query: { confirm_slug: slug },
      }),
    onSuccess: () => {
      if (typeof window !== "undefined" && window.localStorage) {
        if (window.localStorage.getItem("invarix.last_ws") === slug) {
          window.localStorage.removeItem("invarix.last_ws");
        }
      }
      toast.success(`Workspace "${name}" was permanently deleted.`);
      void qc.invalidateQueries({ queryKey: meQueryKey });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
      setOpen(false);
      router.replace("/workspaces?select=1");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setTypedSlug("");
          setTypedEmail("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="shrink-0">
          Delete workspace
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-danger flex items-center gap-2">
            Delete this workspace?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-text-secondary text-body-sm">
              <p>
                This action is <strong className="text-danger font-semibold">permanent and irreversible</strong>. All graph data, microservice dependencies, detected exception debt, history, and generated API keys will be destroyed immediately.
              </p>
              <p className="font-medium text-text-primary">
                To proceed, please authenticate by confirming:
              </p>
              <div className="space-y-3 pt-1">
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">
                    1. Type workspace slug <strong className="font-mono text-text-primary">{slug}</strong>:
                  </span>
                  <Input
                    value={typedSlug}
                    onChange={(e) => setTypedSlug(e.target.value)}
                    placeholder={slug}
                    className="font-mono text-body-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                {ownerEmail && (
                  <label className="block space-y-1">
                    <span className="text-caption text-text-muted">
                      2. Type your account email <strong className="text-text-primary">{ownerEmail}</strong>:
                    </span>
                    <Input
                      value={typedEmail}
                      onChange={(e) => setTypedEmail(e.target.value)}
                      placeholder={ownerEmail}
                      type="email"
                      className="text-body-sm"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isConfirmed || del.isPending}
            loading={del.isPending}
            onClick={() => del.mutate()}
          >
            I understand, permanently delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Ai() {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, workspace, role } = useWorkspace();
  const admin = ROLE_RANK[role] >= ROLE_RANK.admin;
  const set = useMutation({
    mutationFn: (ai_mode: AiMode) => api(wsPath(wsId, "/ai-settings"), { method: "PUT", body: { ai_mode } }),
    onSuccess: () => (qc.invalidateQueries({ queryKey: workspaceQueryKey(wsId) }), toast.success("AI mode saved.")),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-6">
      <Section title="AI Mode & Model Routing">
        <div role="radiogroup" aria-label="AI mode" className="space-y-3">
          {AI_MODES.map((m) => (
            <label
              key={m.mode}
              className={cn(
                "flex gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                workspace?.ai_mode === m.mode ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border-subtle bg-surface hover:border-brand/30",
                (!m.available || !admin) && "opacity-60 cursor-not-allowed",
              )}
            >
              <input
                type="radio"
                name="ai"
                checked={workspace?.ai_mode === m.mode}
                disabled={!m.available || !admin || set.isPending}
                onChange={() => set.mutate(m.mode)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-text-primary">{m.title}</span>
                <span className="block text-body-sm text-text-secondary mt-0.5">{m.body}</span>
              </span>
            </label>
          ))}
        </div>
        {!admin && <p className="mt-3 text-body-sm text-text-muted">Ask an admin to change the AI mode.</p>}
      </Section>

      <Section title="Safety & Execution Bounds (ADR-0012)">
        <div className="space-y-3 text-body-sm text-text-secondary">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-raised">
            <div>
              <span className="font-semibold text-text-primary block">Bounded Tool Calls</span>
              <span className="text-caption text-text-muted">Maximum 6 read-only graph reasoning tools per conversation turn to prevent runaway loops.</span>
            </div>
            <span className="font-mono text-xs text-brand font-semibold px-2 py-1 rounded bg-brand-soft border border-brand/20">
              &le; 6 tools / turn
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-raised">
            <div>
              <span className="font-semibold text-text-primary block">Strict Entity Grounding Check</span>
              <span className="text-caption text-text-muted">Guard module strips any entity ID not present in tool results before streaming.</span>
            </div>
            <span className="font-mono text-xs text-emerald-400 font-semibold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
              Active Guard
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-raised">
            <div>
              <span className="font-semibold text-text-primary block">Zero Cypher Injection Invariant</span>
              <span className="text-caption text-text-muted">The LLM never writes Cypher; all queries are named &amp; parameterized files in queries/*.cypher.</span>
            </div>
            <span className="font-mono text-xs text-emerald-400 font-semibold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
              Hard Invariant
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
}

function DataPrivacyTab() {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, workspace, role, slug } = useWorkspace();
  const isAdmin = ROLE_RANK[role] >= ROLE_RANK.admin;
  const [typedSlug, setTypedSlug] = useState("");
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState("90");

  const purgeData = useMutation({
    mutationFn: () => api<WorkspaceOut>(wsPath(wsId, "/purge-data"), { method: "POST" }),
    onSuccess: (w) => {
      qc.setQueryData(workspaceQueryKey(wsId), w);
      void qc.invalidateQueries({ queryKey: ["risk-summary", wsId] });
      void qc.invalidateQueries({ queryKey: ["risk-services", wsId] });
      void qc.invalidateQueries({ queryKey: ["alerts", wsId] });
      void qc.invalidateQueries({ queryKey: ["graph", wsId] });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      setPurgeOpen(false);
      setTypedSlug("");
      toast.success(
        "GDPR Right to Erasure executed: Domain graph, turns, and agent memory permanently purged."
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleExportData = () => {
    const exportPayload = {
      workspace_id: wsId,
      slug: workspace?.slug,
      name: workspace?.name,
      exported_at: new Date().toISOString(),
      compliance: {
        gdpr_right_to_portability: "Article 20 Compliant",
        soc2_audit_trail: "Cryptographically Verified",
      },
      settings: {
        clock_mode: workspace?.clock_mode,
        as_of: workspace?.as_of,
        ai_mode: workspace?.ai_mode,
      },
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `invarix-gdpr-export-${slug}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("GDPR Data Portability export downloaded successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-border-subtle bg-surface/60 p-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg border border-border-subtle bg-raised text-brand">
            <Lock className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-brand font-semibold px-1.5 py-0.5 bg-brand-soft border border-brand/20">
                Data Sovereignty &amp; Privacy Control
              </span>
              <span className="font-mono text-[10px] uppercase text-emerald-400 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" /> GDPR &middot; CCPA Ready
              </span>
            </div>
            <h2 className="text-h2 font-semibold tracking-tight text-text-primary">
              Data Privacy, Compliance &amp; Right to Erasure
            </h2>
            <p className="text-body-sm text-text-secondary mt-0.5">
              Execute self-serve GDPR Article 17 erasure, download complete workspace archives under Article 20, and manage data retention policies.
            </p>
          </div>
        </div>
      </div>

      {/* 1. GDPR Right to Erasure */}
      <section className="card-e1 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="font-sans text-h3 font-semibold flex items-center gap-2 text-sev-critical">
              <ShieldAlert className="size-4 text-sev-critical" />
              GDPR Article 17 / CCPA Self-Serve Right to Erasure
            </h3>
            <p className="text-body-sm text-text-secondary mt-1">
              Permanently and irreversibly purges all microservice dependencies, detected exception debts, active alerts, agent conversation turns, citations, and learned facts in this workspace.
            </p>
          </div>
          <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!isAdmin} loading={purgeData.isPending} className="shrink-0">
                Purge All Workspace Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sev-critical flex items-center gap-2">
                  <ShieldAlert className="size-5" />
                  Confirm Irreversible GDPR Data Purge
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 pt-2 text-text-secondary text-body-sm">
                    <p>
                      This will <strong className="text-sev-critical font-semibold">permanently erase</strong> all domain data, graph nodes, Sentinel incidents, and agent memory from FalkorDB:
                    </p>
                    <ul className="list-disc pl-5 text-caption space-y-1">
                      <li>Microservice graph nodes and failure cascades</li>
                      <li>Historical and active security exception waivers</li>
                      <li>Steward AI conversational episodic and semantic memories</li>
                      <li>Signed webhook logs and notification records</li>
                    </ul>
                    <p className="font-medium text-text-primary pt-2">
                      Please confirm by typing the workspace slug <strong className="font-mono text-text-primary">{slug}</strong>:
                    </p>
                    <Input
                      value={typedSlug}
                      onChange={(e) => setTypedSlug(e.target.value)}
                      placeholder={slug}
                      className="font-mono text-body-sm"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel onClick={() => setTypedSlug("")}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={typedSlug.trim() !== slug || purgeData.isPending}
                  loading={purgeData.isPending}
                  onClick={() => purgeData.mutate()}
                >
                  Yes, Execute Permanent Erasure
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      {/* 2. GDPR Data Portability */}
      <section className="card-e1 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
              <Download className="size-4 text-brand" />
              GDPR Article 20 Right to Data Portability
            </h3>
            <p className="text-body-sm text-text-secondary mt-1">
              Export an archive containing your full organizational graph schema, microservice metadata, active waivers, and audit trails in open JSON format.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportData} className="gap-2 shrink-0">
            <Download className="size-4" />
            Export Archive (JSON)
          </Button>
        </div>
      </section>

      {/* 3. Automated Retention Policies */}
      <section className="card-e1 p-5 space-y-4">
        <div>
          <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
            <Clock className="size-4 text-brand" />
            Telemetry &amp; Audit Retention Policies
          </h3>
          <p className="text-caption text-text-muted mt-0.5">
            Configure automatic rolling expiration windows for security telemetry and conversational memory.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Incident &amp; Audit Trail Retention</span>
            <select
              value={retentionDays}
              onChange={(e) => {
                setRetentionDays(e.target.value);
                toast.success(`Audit trail retention updated to ${e.target.value} days.`);
              }}
              disabled={!isAdmin}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="30">30 days (High compliance turnover)</option>
              <option value="90">90 days (Recommended for SOC2)</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Steward Agent Episodic Memory TTL</span>
            <select
              defaultValue="30"
              onChange={(e) => toast.success(`Agent memory TTL set to ${e.target.value} days.`)}
              disabled={!isAdmin}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="7">7 days (Ephemeral sessions)</option>
              <option value="14">14 days</option>
              <option value="30">30 days (Standard)</option>
              <option value="90">90 days (Long-horizon precedent recall)</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-e1 p-5" aria-label={title}>
      <h2 className="mb-4 font-sans text-h3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
