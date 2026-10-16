"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
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
import { SettingsWorkspaceHub } from "@/components/ui/settings";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { AiMode, WorkspaceOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { meQueryKey, useMe, useWorkspace, workspaceQueryKey } from "@/lib/workspace";

const ROLE_RANK = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 } as const;
const AI_MODES: { mode: AiMode; title: string; body: string; available: boolean }[] = [
  { mode: "cloud", title: "Cloud", body: "Steward uses the configured hosted model. It receives entity IDs, names and short excerpts, never whole records.", available: true },
  { mode: "private", title: "Private", body: "Only a local or self-hosted model is used; nothing is sent to a cloud provider. Arrives with the private beta.", available: false },
  { mode: "off", title: "Off", body: "No AI calls. Detection, scores, owner routing, proof paths and Quick answers keep working.", available: true },
];

/** SCR-P-18: profile, workspace, AI mode, API keys. */
export function SettingsScreen({ tab }: { tab: SettingsTab }) {
  const { slug } = useWorkspace();
  return (
    <PageContainer>
      <PageHeader title="Settings" />
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <nav aria-label="Settings sections" className="flex gap-1 md:flex-col">
          {(Object.keys(TABS) as SettingsTab[]).map((k) => (
            <Link
              key={k}
              href={`/w/${slug}/settings/${k}`}
              aria-current={k === tab ? "page" : undefined}
              className={cn("rounded-md px-3 py-2 text-body-sm", k === tab ? "bg-brand-soft font-medium" : "text-text-secondary hover:bg-brand-soft")}
            >
              {TABS[k]}
            </Link>
          ))}
        </nav>
        <div className={cn("space-y-6", tab === "workspace" || tab === "api-keys" || tab === "integrations" || tab === "billing" ? "max-w-5xl" : "max-w-2xl")}>
          {tab === "profile" ? (
            <Profile />
          ) : tab === "workspace" ? (
            <Workspace />
          ) : tab === "ai" ? (
            <Ai />
          ) : tab === "integrations" ? (
            <IntegrationsTab />
          ) : tab === "billing" ? (
            <BillingTab />
          ) : (
            <ApiKeysSection />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Profile() {
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api(`/me`, { method: "PATCH", body: { name } }),
    onSuccess: () => (qc.invalidateQueries({ queryKey: meQueryKey }), toast.success("Profile saved.")),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <Section title="Profile">
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium">Name</span>
            <Input value={name ?? me.data?.user.name ?? ""} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </label>
          <p className="text-body-sm text-text-muted">Email: {me.data?.user.email}</p>
          <Button type="submit" loading={save.isPending} disabled={name === null}>
            Save
          </Button>
        </form>
      </Section>
      <Section title="Theme">
        <div role="radiogroup" aria-label="Theme" className="flex gap-2">
          {["system", "light", "dark"].map((t) => (
            <Button key={t} role="radio" aria-checked={theme === t} variant={theme === t ? "default" : "secondary"} size="sm" onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </Section>
    </>
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
    <Section title="AI mode">
      <div role="radiogroup" aria-label="AI mode" className="space-y-2">
        {AI_MODES.map((m) => (
          <label
            key={m.mode}
            className={cn(
              "flex gap-3 rounded-md border p-3",
              workspace?.ai_mode === m.mode ? "border-brand bg-brand-soft" : "border-border-subtle",
              (!m.available || !admin) && "opacity-60",
            )}
          >
            <input type="radio" name="ai" checked={workspace?.ai_mode === m.mode} disabled={!m.available || !admin || set.isPending} onChange={() => set.mutate(m.mode)} className="mt-1" />
            <span>
              <span className="block font-medium">{m.title}</span>
              <span className="block text-body-sm text-text-secondary">{m.body}</span>
            </span>
          </label>
        ))}
      </div>
      {!admin && <p className="mt-3 text-body-sm text-text-muted">Ask an admin to change the AI mode.</p>}
    </Section>
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
