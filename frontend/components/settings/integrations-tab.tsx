"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Mail, Send, Terminal, Webhook, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

import {
  GitHubBrandLogo,
  SlackBrandLogo,
  JiraBrandLogo,
  PagerDutyBrandLogo,
  DatadogBrandLogo,
  GitLabBrandLogo,
  ServiceNowBrandLogo,
  SvixBrandLogo,
} from "@/components/icons/brand-logos";

interface IntegrationsData {
  slack: {
    enabled: boolean;
    webhook_url: string;
    channel: string;
    notify_on: string[];
  };
  email: {
    enabled: boolean;
    recipients: string[];
    digest_weekly: boolean;
    notify_on_critical: boolean;
  };
  github: {
    enabled: boolean;
    repo: string;
    block_on_fail: boolean;
  };
  webhooks: {
    enabled: boolean;
    endpoint_url: string;
    secret: string;
  };
}

type IntegrationId =
  | "github"
  | "slack"
  | "jira"
  | "pagerduty"
  | "datadog"
  | "gitlab"
  | "servicenow"
  | "webhooks";

interface IntegrationCatalogItem {
  id: IntegrationId;
  name: string;
  category: string;
  description: string;
  logo: React.ComponentType<{ className?: string }>;
}

const INTEGRATIONS_CATALOG: IntegrationCatalogItem[] = [
  {
    id: "github",
    name: "GitHub Actions",
    category: "CI / CD",
    description: "Block PR merges automatically on critical architectural debt.",
    logo: GitHubBrandLogo,
  },
  {
    id: "slack",
    name: "Slack",
    category: "Alerts",
    description: "Broadcast real-time incident cards and rule violations.",
    logo: SlackBrandLogo,
  },
  {
    id: "jira",
    name: "Jira Software",
    category: "Issues",
    description: "Bi-directional sync of policy exceptions and tickets.",
    logo: JiraBrandLogo,
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    category: "On-Call",
    description: "Trigger on-call escalation policies for P1 cascade alerts.",
    logo: PagerDutyBrandLogo,
  },
  {
    id: "datadog",
    name: "Datadog",
    category: "Monitoring",
    description: "Ingest service dependency topology and live APM metrics.",
    logo: DatadogBrandLogo,
  },
  {
    id: "gitlab",
    name: "GitLab CI",
    category: "CI / CD",
    description: "Evaluate merge requests against architectural safety rules.",
    logo: GitLabBrandLogo,
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    category: "ITSM",
    description: "Sync waiver governance with Change Advisory Board records.",
    logo: ServiceNowBrandLogo,
  },
  {
    id: "webhooks",
    name: "Svix Webhooks",
    category: "Event Bus",
    description: "Signed HMAC-SHA256 event streams to any custom endpoint.",
    logo: SvixBrandLogo,
  },
];

export function IntegrationsTab() {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, role } = useWorkspace();
  const isAdmin = role === "owner" || role === "admin";
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery<IntegrationsData>({
    queryKey: ["integrations", wsId],
    queryFn: () => api(wsPath(wsId, "/integrations")),
  });

  // Modal State
  const [activeModal, setActiveModal] = useState<IntegrationId | null>(null);

  // Form states for core integrations
  const [slackUrl, setSlackUrl] = useState<string | null>(null);
  const [slackChannel, setSlackChannel] = useState<string | null>(null);
  const [slackEnabled, setSlackEnabled] = useState<boolean | null>(null);

  const [emailRecipients, setEmailRecipients] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [emailDigest, setEmailDigest] = useState<boolean | null>(null);

  const [githubEnabled, setGithubEnabled] = useState<boolean | null>(null);
  const [githubRepo, setGithubRepo] = useState<string | null>(null);
  const [githubBlockOnFail, setGithubBlockOnFail] = useState<boolean | null>(null);

  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean | null>(null);
  const [showHmacVerifier, setShowHmacVerifier] = useState(false);
  const [hmacSamplePayload, setHmacSamplePayload] = useState('{"event":"alert.critical","rule_id":"R4"}');
  const [hmacResult, setHmacResult] = useState<{ ts: string; signature: string } | null>(null);

  // Form states for ecosystem integrations (stored locally & verified via backend)
  const [extraIntegrations, setExtraIntegrations] = useState<{
    jira: { enabled: boolean; url: string; project_key: string; api_token: string };
    pagerduty: { enabled: boolean; routing_key: string; escalation_policy: string };
    datadog: { enabled: boolean; api_key: string; service_tag: string };
    gitlab: { enabled: boolean; url: string; project_id: string };
    servicenow: { enabled: boolean; url: string; table: string };
  }>({
    jira: { enabled: false, url: "", project_key: "ENG", api_token: "" },
    pagerduty: { enabled: false, routing_key: "", escalation_policy: "Engineering Escalation" },
    datadog: { enabled: false, api_key: "", service_tag: "env:production" },
    gitlab: { enabled: false, url: "https://gitlab.com", project_id: "" },
    servicenow: { enabled: false, url: "", table: "change_request" },
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`invarix_extra_integrations_${wsId}`);
      if (stored) {
        setExtraIntegrations((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {}
  }, [wsId]);

  const saveExtraIntegrations = (next: typeof extraIntegrations) => {
    setExtraIntegrations(next);
    try {
      localStorage.setItem(`invarix_extra_integrations_${wsId}`, JSON.stringify(next));
    } catch {}
  };

  const saveMutation = useMutation({
    mutationFn: (body: Partial<IntegrationsData>) =>
      api(wsPath(wsId, "/integrations"), {
        method: "PUT",
        body,
      }),
    onSuccess: () => {
      toast.success("Integration settings saved.");
      void qc.invalidateQueries({ queryKey: ["integrations", wsId] });
      setActiveModal(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const testMutation = useMutation({
    mutationFn: (body: { plugin: string; config: Record<string, unknown> }) =>
      api<{ ok: boolean; message: string }>(wsPath(wsId, "/integrations/test"), {
        method: "POST",
        body,
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading || !data) {
    return <div className="p-8 text-center text-text-muted font-mono text-body-sm">Loading integrations…</div>;
  }

  const curSlackEnabled = slackEnabled ?? data.slack.enabled;
  const curSlackUrl = slackUrl ?? data.slack.webhook_url;
  const curSlackChannel = slackChannel ?? data.slack.channel;

  const curEmailEnabled = emailEnabled ?? data.email.enabled;
  const curEmailRecipients = emailRecipients ?? data.email.recipients.join(", ");
  const curEmailDigest = emailDigest ?? data.email.digest_weekly;

  const curGithubEnabled = githubEnabled ?? data.github.enabled;
  const curGithubRepo = githubRepo ?? data.github.repo;
  const curGithubBlockOnFail = githubBlockOnFail ?? data.github.block_on_fail;

  const curWebhookEnabled = webhookEnabled ?? data.webhooks.enabled;
  const curWebhookUrl = webhookUrl ?? data.webhooks.endpoint_url;

  const computeHmac = async (secret: string, payload: string) => {
    try {
      const ts = Math.floor(Date.now() / 1000).toString();
      const stringToSign = `${ts}.${payload.trim()}`;
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuf = await window.crypto.subtle.sign(
        "HMAC",
        key,
        enc.encode(stringToSign)
      );
      const hex = Array.from(new Uint8Array(signatureBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setHmacResult({ ts, signature: `v1=${hex}` });
      toast.success("HMAC header X-INVARIX-Signature calculated!");
    } catch {
      toast.error("Failed to calculate HMAC signature.");
    }
  };

  const isPluginActive = (id: IntegrationId): boolean => {
    switch (id) {
      case "github":
        return curGithubEnabled;
      case "slack":
        return curSlackEnabled;
      case "webhooks":
        return curWebhookEnabled;
      case "jira":
        return extraIntegrations.jira.enabled;
      case "pagerduty":
        return extraIntegrations.pagerduty.enabled;
      case "datadog":
        return extraIntegrations.datadog.enabled;
      case "gitlab":
        return extraIntegrations.gitlab.enabled;
      case "servicenow":
        return extraIntegrations.servicenow.enabled;
    }
  };

  const getPluginDetails = (id: IntegrationId): string => {
    switch (id) {
      case "github":
        return curGithubRepo || "Not configured";
      case "slack":
        return curSlackChannel || "Not configured";
      case "webhooks":
        return curWebhookUrl ? "Webhook endpoint set" : "Not configured";
      case "jira":
        return extraIntegrations.jira.url || "Not configured";
      case "pagerduty":
        return extraIntegrations.pagerduty.routing_key ? "Routing key active" : "Not configured";
      case "datadog":
        return extraIntegrations.datadog.service_tag || "Not configured";
      case "gitlab":
        return extraIntegrations.gitlab.project_id || "Not configured";
      case "servicenow":
        return extraIntegrations.servicenow.url || "Not configured";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Catalog */}
      <section className="space-y-4">
        <div>
          <h2 className="text-body-lg font-semibold text-text-primary">
            Integrations
          </h2>
          <p className="text-body-sm text-text-muted mt-0.5">
            Connect alerting, incident response, and CI/CD tools to automate risk prevention across your workflow.
          </p>
        </div>

        {/* 8 Functional Interactive Integration Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INTEGRATIONS_CATALOG.map((item) => {
            const Logo = item.logo;
            const active = isPluginActive(item.id);
            const detail = getPluginDetails(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModal(item.id)}
                className={cn(
                  "group flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer",
                  active
                    ? "border-brand/40 bg-surface-raised shadow-xs hover:border-brand hover:shadow-sm"
                    : "border-border-subtle bg-surface hover:border-brand/30 hover:bg-surface-raised hover:shadow-xs"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Logo className="size-6 text-text-primary shrink-0" />
                    <span
                      className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded border transition-colors",
                        active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-surface-sunken text-text-muted border-border-subtle"
                      )}
                    >
                      {active ? "Active" : "Configure"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="font-semibold text-body-sm text-text-primary block group-hover:text-brand transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[12px] text-text-secondary line-clamp-2 mt-0.5">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border-subtle/60 flex items-center justify-between text-[11px] text-text-muted">
                  <span className="truncate max-w-[130px] font-mono">{detail}</span>
                  <span className="text-brand font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Configure &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Transactional Email Alerts Section */}
      <section className="p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken text-text-primary">
              <Mail className="size-4" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-text-primary flex items-center gap-2">
                Email Notifications
                {curEmailEnabled && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-caption text-text-muted">
                Receive weekly exception debt digests and immediate alerts for critical P1 collisions.
              </p>
            </div>
          </div>
          <Switch
            checked={curEmailEnabled}
            disabled={!isAdmin}
            onCheckedChange={(checked) => setEmailEnabled(checked)}
            aria-label="Toggle Email notifications"
          />
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Notification Recipients (comma-separated)</span>
            <Input
              value={curEmailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              placeholder="sre-team@company.com, ciso-office@company.com"
              className="text-body-sm rounded-md"
              disabled={!isAdmin}
            />
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="weekly_digest"
              checked={curEmailDigest}
              disabled={!isAdmin}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="rounded border-border-subtle accent-brand size-4 cursor-pointer"
            />
            <label htmlFor="weekly_digest" className="text-body-sm text-text-secondary select-none cursor-pointer">
              Send weekly Monday digest of expiring waivers and unassigned exceptions.
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-caption text-text-muted">
            Transactional delivery powered by Maileroo API.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={testMutation.isPending}
              onClick={() =>
                testMutation.mutate({
                  plugin: "email",
                  config: {
                    recipients: curEmailRecipients.split(",").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            >
              <Send className="mr-1.5 size-3.5" />
              Send test email
            </Button>
            <Button
              size="sm"
              disabled={!isAdmin || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  email: {
                    enabled: curEmailEnabled,
                    recipients: curEmailRecipients.split(",").map((s) => s.trim()).filter(Boolean),
                    digest_weekly: curEmailDigest,
                    notify_on_critical: true,
                  },
                })
              }
            >
              Save Email Settings
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Model Context Protocol (MCP) IDE Tooling */}
      <section className="p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken text-brand">
              <Terminal className="size-4" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-text-primary">
                Model Context Protocol (MCP) Endpoint
              </h3>
              <p className="text-caption text-text-muted">
                Connect Cursor, Claude Desktop, or VS Code to query workspace risk graphs via 14 read-only reasoning tools.
              </p>
            </div>
          </div>
          <span className="rounded bg-brand/10 border border-brand/20 px-2 py-0.5 font-mono text-[11px] font-medium text-brand">
            14 Tools Ready
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-caption font-medium text-text-muted">
            Configuration for <code className="text-brand font-mono">claude_desktop_config.json</code>:
          </span>
          <div className="relative rounded-lg border border-border-subtle bg-surface-sunken p-3.5">
            <pre className="font-mono text-caption text-text-primary overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "invarix": {
      "command": "npx",
      "args": ["-y", "invarix-mcp@latest", "--workspace", "${wsId}"]
    }
  }
}`}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2.5 right-2.5 h-7 px-2 font-mono text-[11px]"
              onClick={() =>
                copyToClipboard(
                  `{\n  "mcpServers": {\n    "invarix": {\n      "command": "npx",\n      "args": ["-y", "invarix-mcp@latest", "--workspace", "${wsId}"]\n    }\n  }\n}`,
                  "mcp-config"
                )
              }
            >
              {copiedKey === "mcp-config" ? <Check className="size-3 text-emerald-500 mr-1" /> : <Copy className="size-3 mr-1" />}
              {copiedKey === "mcp-config" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Unified Interactive Modal for all 8 Integrations */}
      {activeModal && (
        <IntegrationModal
          id={activeModal}
          isOpen={true}
          onClose={() => setActiveModal(null)}
          isAdmin={isAdmin}
          wsId={wsId}
          // Core values
          curGithubEnabled={curGithubEnabled}
          curGithubRepo={curGithubRepo}
          curGithubBlockOnFail={curGithubBlockOnFail}
          onSaveGithub={(enabled, repo, blockOnFail) => {
            setGithubEnabled(enabled);
            setGithubRepo(repo);
            setGithubBlockOnFail(blockOnFail);
            saveMutation.mutate({
              github: { enabled, repo, block_on_fail: blockOnFail },
            });
          }}
          curSlackEnabled={curSlackEnabled}
          curSlackUrl={curSlackUrl}
          curSlackChannel={curSlackChannel}
          onSaveSlack={(enabled, url, channel) => {
            setSlackEnabled(enabled);
            setSlackUrl(url);
            setSlackChannel(channel);
            saveMutation.mutate({
              slack: { enabled, webhook_url: url, channel, notify_on: ["critical"] },
            });
          }}
          curWebhookEnabled={curWebhookEnabled}
          curWebhookUrl={curWebhookUrl}
          webhookSecret={data.webhooks.secret}
          onSaveWebhooks={(enabled, endpoint) => {
            setWebhookEnabled(enabled);
            setWebhookUrl(endpoint);
            saveMutation.mutate({
              webhooks: { enabled, endpoint_url: endpoint, secret: data.webhooks.secret },
            });
          }}
          // Extra values
          extraIntegrations={extraIntegrations}
          onSaveExtra={(next) => {
            saveExtraIntegrations(next);
            toast.success("Integration settings saved.");
            setActiveModal(null);
          }}
          onTestConnection={(plugin, config) => {
            testMutation.mutate({ plugin, config });
          }}
          testPending={testMutation.isPending}
          // HMAC helper
          computeHmac={computeHmac}
          hmacResult={hmacResult}
          showHmacVerifier={showHmacVerifier}
          setShowHmacVerifier={setShowHmacVerifier}
          hmacSamplePayload={hmacSamplePayload}
          setHmacSamplePayload={setHmacSamplePayload}
          copyToClipboard={copyToClipboard}
          copiedKey={copiedKey}
        />
      )}
    </div>
  );
}

function IntegrationModal({
  id,
  isOpen,
  onClose,
  isAdmin,
  wsId,
  curGithubEnabled,
  curGithubRepo,
  curGithubBlockOnFail,
  onSaveGithub,
  curSlackEnabled,
  curSlackUrl,
  curSlackChannel,
  onSaveSlack,
  curWebhookEnabled,
  curWebhookUrl,
  webhookSecret,
  onSaveWebhooks,
  extraIntegrations,
  onSaveExtra,
  onTestConnection,
  testPending,
  computeHmac,
  hmacResult,
  showHmacVerifier,
  setShowHmacVerifier,
  hmacSamplePayload,
  setHmacSamplePayload,
  copyToClipboard,
  copiedKey,
}: {
  id: IntegrationId;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  wsId: string;
  curGithubEnabled: boolean;
  curGithubRepo: string;
  curGithubBlockOnFail: boolean;
  onSaveGithub: (enabled: boolean, repo: string, blockOnFail: boolean) => void;
  curSlackEnabled: boolean;
  curSlackUrl: string;
  curSlackChannel: string;
  onSaveSlack: (enabled: boolean, url: string, channel: string) => void;
  curWebhookEnabled: boolean;
  curWebhookUrl: string;
  webhookSecret: string;
  onSaveWebhooks: (enabled: boolean, endpoint: string) => void;
  extraIntegrations: {
    jira: { enabled: boolean; url: string; project_key: string; api_token: string };
    pagerduty: { enabled: boolean; routing_key: string; escalation_policy: string };
    datadog: { enabled: boolean; api_key: string; service_tag: string };
    gitlab: { enabled: boolean; url: string; project_id: string };
    servicenow: { enabled: boolean; url: string; table: string };
  };
  onSaveExtra: (next: typeof extraIntegrations) => void;
  onTestConnection: (plugin: string, config: Record<string, unknown>) => void;
  testPending: boolean;
  computeHmac: (secret: string, payload: string) => void;
  hmacResult: { ts: string; signature: string } | null;
  showHmacVerifier: boolean;
  setShowHmacVerifier: (val: boolean) => void;
  hmacSamplePayload: string;
  setHmacSamplePayload: (val: string) => void;
  copyToClipboard: (text: string, id: string) => void;
  copiedKey: string | null;
}) {
  const item = INTEGRATIONS_CATALOG.find((x) => x.id === id)!;
  const Logo = item.logo;

  // Local state for modal inputs
  const [ghEnabled, setGhEnabled] = useState(curGithubEnabled);
  const [ghRepo, setGhRepo] = useState(curGithubRepo);
  const [ghBlock, setGhBlock] = useState(curGithubBlockOnFail);

  const [slEnabled, setSlEnabled] = useState(curSlackEnabled);
  const [slUrl, setSlUrl] = useState(curSlackUrl);
  const [slChannel, setSlChannel] = useState(curSlackChannel);

  const [whEnabled, setWhEnabled] = useState(curWebhookEnabled);
  const [whUrl, setWhUrl] = useState(curWebhookUrl);

  const [jiraData, setJiraData] = useState(extraIntegrations.jira);
  const [pdData, setPdData] = useState(extraIntegrations.pagerduty);
  const [ddData, setDdData] = useState(extraIntegrations.datadog);
  const [glData, setGlData] = useState(extraIntegrations.gitlab);
  const [snData, setSnData] = useState(extraIntegrations.servicenow);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6 bg-surface border border-border-subtle shadow-xl">
        <DialogHeader className="space-y-2 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <Logo className="size-8 text-text-primary shrink-0" />
            <div>
              <DialogTitle className="text-body-lg font-bold text-text-primary flex items-center gap-2">
                {item.name}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border-subtle bg-surface-sunken text-text-secondary">
                  {item.category}
                </span>
              </DialogTitle>
              <DialogDescription className="text-caption text-text-muted mt-0.5">
                {item.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Form Body */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* GitHub Form */}
          {id === "github" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable GitHub PR Gate
                  </span>
                  <span className="text-caption text-text-muted">
                    Scan pull requests for unhandled debt and policy waivers.
                  </span>
                </div>
                <Switch
                  checked={ghEnabled}
                  disabled={!isAdmin}
                  onCheckedChange={setGhEnabled}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Repository (owner/repo)</span>
                <Input
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  placeholder="e.g. northwind-corp/payments-service"
                  disabled={!isAdmin}
                />
              </label>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-medium text-text-primary block">
                    Strict Blocking Mode
                  </span>
                  <span className="text-caption text-text-muted">
                    Fail CI checks if critical risks or orphaned owners exist.
                  </span>
                </div>
                <Switch
                  checked={ghBlock}
                  disabled={!isAdmin}
                  onCheckedChange={setGhBlock}
                />
              </div>
            </div>
          )}

          {/* Slack Form */}
          {id === "slack" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable Slack Notifications
                  </span>
                  <span className="text-caption text-text-muted">
                    Broadcast critical graph collisions and policy expiries.
                  </span>
                </div>
                <Switch
                  checked={slEnabled}
                  disabled={!isAdmin}
                  onCheckedChange={setSlEnabled}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Incoming Webhook URL</span>
                <Input
                  value={slUrl}
                  onChange={(e) => setSlUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  disabled={!isAdmin}
                />
              </label>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Channel</span>
                <Input
                  value={slChannel}
                  onChange={(e) => setSlChannel(e.target.value)}
                  placeholder="#sre-alerts"
                  disabled={!isAdmin}
                />
              </label>
            </div>
          )}

          {/* Jira Form */}
          {id === "jira" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable Jira Sync
                  </span>
                  <span className="text-caption text-text-muted">
                    Create and sync Jira issues for identified graph risks.
                  </span>
                </div>
                <Switch
                  checked={jiraData.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(checked) => setJiraData({ ...jiraData, enabled: checked })}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Jira Instance URL</span>
                <Input
                  value={jiraData.url}
                  onChange={(e) => setJiraData({ ...jiraData, url: e.target.value })}
                  placeholder="https://your-company.atlassian.net"
                  disabled={!isAdmin}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-body-sm">
                  <span className="font-medium text-text-primary">Project Key</span>
                  <Input
                    value={jiraData.project_key}
                    onChange={(e) => setJiraData({ ...jiraData, project_key: e.target.value })}
                    placeholder="ENG"
                    disabled={!isAdmin}
                  />
                </label>
                <label className="block space-y-1.5 text-body-sm">
                  <span className="font-medium text-text-primary">API Token</span>
                  <Input
                    type="password"
                    value={jiraData.api_token}
                    onChange={(e) => setJiraData({ ...jiraData, api_token: e.target.value })}
                    placeholder="••••••••••••••••"
                    disabled={!isAdmin}
                  />
                </label>
              </div>
            </div>
          )}

          {/* PagerDuty Form */}
          {id === "pagerduty" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable PagerDuty Alerts
                  </span>
                  <span className="text-caption text-text-muted">
                    Route P1 high-severity cascade risks directly to on-call schedules.
                  </span>
                </div>
                <Switch
                  checked={pdData.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(checked) => setPdData({ ...pdData, enabled: checked })}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Routing / Integration Key</span>
                <Input
                  type="password"
                  value={pdData.routing_key}
                  onChange={(e) => setPdData({ ...pdData, routing_key: e.target.value })}
                  placeholder="pd_events_key_32_chars"
                  disabled={!isAdmin}
                />
              </label>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Escalation Policy Name</span>
                <Input
                  value={pdData.escalation_policy}
                  onChange={(e) => setPdData({ ...pdData, escalation_policy: e.target.value })}
                  placeholder="Primary Infrastructure On-Call"
                  disabled={!isAdmin}
                />
              </label>
            </div>
          )}

          {/* Datadog Form */}
          {id === "datadog" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable Datadog Integration
                  </span>
                  <span className="text-caption text-text-muted">
                    Correlate live APM latency and error rates with exception nodes.
                  </span>
                </div>
                <Switch
                  checked={ddData.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(checked) => setDdData({ ...ddData, enabled: checked })}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Datadog API Key</span>
                <Input
                  type="password"
                  value={ddData.api_key}
                  onChange={(e) => setDdData({ ...ddData, api_key: e.target.value })}
                  placeholder="dd_api_key_••••••••"
                  disabled={!isAdmin}
                />
              </label>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Service Tag Scope</span>
                <Input
                  value={ddData.service_tag}
                  onChange={(e) => setDdData({ ...ddData, service_tag: e.target.value })}
                  placeholder="env:production,team:core"
                  disabled={!isAdmin}
                />
              </label>
            </div>
          )}

          {/* GitLab Form */}
          {id === "gitlab" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable GitLab CI Gate
                  </span>
                  <span className="text-caption text-text-muted">
                    Validate merge requests against exception expiry rules.
                  </span>
                </div>
                <Switch
                  checked={glData.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(checked) => setGlData({ ...glData, enabled: checked })}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">GitLab Instance URL</span>
                <Input
                  value={glData.url}
                  onChange={(e) => setGlData({ ...glData, url: e.target.value })}
                  placeholder="https://gitlab.com"
                  disabled={!isAdmin}
                />
              </label>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Project ID or Path</span>
                <Input
                  value={glData.project_id}
                  onChange={(e) => setGlData({ ...glData, project_id: e.target.value })}
                  placeholder="group/project"
                  disabled={!isAdmin}
                />
              </label>
            </div>
          )}

          {/* ServiceNow Form */}
          {id === "servicenow" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable ServiceNow CAB Governance
                  </span>
                  <span className="text-caption text-text-muted">
                    Synchronize policy waivers with official change request records.
                  </span>
                </div>
                <Switch
                  checked={snData.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(checked) => setSnData({ ...snData, enabled: checked })}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Instance URL</span>
                <Input
                  value={snData.url}
                  onChange={(e) => setSnData({ ...snData, url: e.target.value })}
                  placeholder="https://your-instance.service-now.com"
                  disabled={!isAdmin}
                />
              </label>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Target Change Table</span>
                <Input
                  value={snData.table}
                  onChange={(e) => setSnData({ ...snData, table: e.target.value })}
                  placeholder="change_request"
                  disabled={!isAdmin}
                />
              </label>
            </div>
          )}

          {/* Webhooks Form */}
          {id === "webhooks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-sunken">
                <div>
                  <span className="text-body-sm font-semibold text-text-primary block">
                    Enable Outgoing Webhooks
                  </span>
                  <span className="text-caption text-text-muted">
                    Stream signed JSON payloads upon exception creation and risk alerts.
                  </span>
                </div>
                <Switch
                  checked={whEnabled}
                  disabled={!isAdmin}
                  onCheckedChange={setWhEnabled}
                />
              </div>

              <label className="block space-y-1.5 text-body-sm">
                <span className="font-medium text-text-primary">Listener Endpoint URL</span>
                <Input
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  placeholder="https://siem.internal/api/v1/invarix-events"
                  disabled={!isAdmin}
                />
              </label>

              <div className="p-3 rounded-lg border border-border-subtle bg-surface-sunken space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-medium text-text-muted">Webhook Signing Secret</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => copyToClipboard(webhookSecret, "wh-sec")}
                  >
                    {copiedKey === "wh-sec" ? <Check className="size-3 text-emerald-500 mr-1" /> : <Copy className="size-3 mr-1" />}
                    {copiedKey === "wh-sec" ? "Copied" : "Copy Secret"}
                  </Button>
                </div>
                <p className="font-mono text-xs text-text-primary font-semibold break-all">
                  {webhookSecret}
                </p>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowHmacVerifier(!showHmacVerifier)}
                  className="text-xs"
                >
                  {showHmacVerifier ? "Hide HMAC Verifier" : "Open HMAC Signature Inspector"}
                </Button>

                {showHmacVerifier && (
                  <div className="mt-3 p-3 rounded-lg border border-border-subtle bg-surface space-y-3 text-xs">
                    <span className="font-medium text-text-primary block">
                      Verify HMAC-SHA256 Header (<code>X-INVARIX-Signature</code>)
                    </span>
                    <textarea
                      rows={2}
                      value={hmacSamplePayload}
                      onChange={(e) => setHmacSamplePayload(e.target.value)}
                      className="w-full rounded border border-border-subtle bg-surface-sunken p-2 font-mono text-xs text-text-primary"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => computeHmac(webhookSecret, hmacSamplePayload)}
                      className="text-xs"
                    >
                      Compute Signature
                    </Button>
                    {hmacResult && (
                      <div className="space-y-1 pt-1 font-mono text-[11px] text-text-secondary">
                        <div>Timestamp: {hmacResult.ts}</div>
                        <div className="break-all text-emerald-600 dark:text-emerald-400">
                          Signature: {hmacResult.signature}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border-subtle pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testPending}
            onClick={() => {
              if (id === "github") {
                onTestConnection("github", { repo: ghRepo });
              } else if (id === "slack") {
                onTestConnection("slack", { webhook_url: slUrl, channel: slChannel });
              } else if (id === "webhooks") {
                onTestConnection("webhooks", { endpoint_url: whUrl, secret: webhookSecret });
              } else if (id === "jira") {
                onTestConnection("jira", { url: jiraData.url, project: jiraData.project_key });
              } else if (id === "pagerduty") {
                onTestConnection("pagerduty", { routing_key: pdData.routing_key });
              } else if (id === "datadog") {
                onTestConnection("datadog", { api_key: ddData.api_key });
              } else if (id === "gitlab") {
                onTestConnection("gitlab", { url: glData.url });
              } else if (id === "servicenow") {
                onTestConnection("servicenow", { url: snData.url });
              }
            }}
          >
            <Send className="size-3.5 mr-1.5" />
            Test Connection
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isAdmin}
              onClick={() => {
                if (id === "github") {
                  onSaveGithub(ghEnabled, ghRepo, ghBlock);
                } else if (id === "slack") {
                  onSaveSlack(slEnabled, slUrl, slChannel);
                } else if (id === "webhooks") {
                  onSaveWebhooks(whEnabled, whUrl);
                } else if (id === "jira") {
                  onSaveExtra({ ...extraIntegrations, jira: jiraData });
                } else if (id === "pagerduty") {
                  onSaveExtra({ ...extraIntegrations, pagerduty: pdData });
                } else if (id === "datadog") {
                  onSaveExtra({ ...extraIntegrations, datadog: ddData });
                } else if (id === "gitlab") {
                  onSaveExtra({ ...extraIntegrations, gitlab: glData });
                } else if (id === "servicenow") {
                  onSaveExtra({ ...extraIntegrations, servicenow: snData });
                }
              }}
            >
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
