"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Mail, Send, Terminal, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

function SlackIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Slack">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function GithubIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="GitHub">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

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

  const [slackUrl, setSlackUrl] = useState<string | null>(null);
  const [slackChannel, setSlackChannel] = useState<string | null>(null);
  const [slackEnabled, setSlackEnabled] = useState<boolean | null>(null);

  const [emailRecipients, setEmailRecipients] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [emailDigest, setEmailDigest] = useState<boolean | null>(null);

  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean | null>(null);

  const saveMutation = useMutation({
    mutationFn: (body: Partial<IntegrationsData>) =>
      api(wsPath(wsId, "/integrations"), {
        method: "PUT",
        body,
      }),
    onSuccess: () => {
      toast.success("Integration settings saved.");
      void qc.invalidateQueries({ queryKey: ["integrations", wsId] });
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

  const curWebhookEnabled = webhookEnabled ?? data.webhooks.enabled;
  const curWebhookUrl = webhookUrl ?? data.webhooks.endpoint_url;

  return (
    <div className="space-y-6">
      {/* 1. Slack / Discord Webhook Plugin */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-[#4A154B]/20 text-[#ECB22E]">
              <SlackIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-sans text-body font-semibold flex items-center gap-2">
                Slack / Discord Operational Alerts
                {curSlackEnabled && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-body-sm text-text-secondary">
                Broadcast real-time incident cards and multi-hop graph cascades to an engineering channel.
              </p>
            </div>
          </div>
          <Switch
            checked={curSlackEnabled}
            disabled={!isAdmin}
            onCheckedChange={(checked) => setSlackEnabled(checked)}
            aria-label="Toggle Slack plugin"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Incoming Webhook URL</span>
            <Input
              value={curSlackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
              className="font-mono text-body-sm rounded-md"
              disabled={!isAdmin}
            />
          </label>
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Notification Channel</span>
            <Input
              value={curSlackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              placeholder="#sre-alerts"
              className="font-mono text-body-sm rounded-md"
              disabled={!isAdmin}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-caption text-text-muted">
            Fires automatically whenever Sentinel identifies a <strong>Critical P1</strong> rule collision.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!curSlackUrl || testMutation.isPending}
              onClick={() =>
                testMutation.mutate({
                  plugin: "slack",
                  config: { webhook_url: curSlackUrl, channel: curSlackChannel },
                })
              }
            >
              <Send className="mr-1.5 size-3.5" />
              Send test alert
            </Button>
            <Button
              size="sm"
              disabled={!isAdmin || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  slack: {
                    enabled: curSlackEnabled,
                    webhook_url: curSlackUrl,
                    channel: curSlackChannel,
                    notify_on: ["critical"],
                  },
                })
              }
            >
              Save Slack config
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Maileroo Transactional Email Plugin */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-brand/10 text-brand">
              <Mail className="size-5" />
            </div>
            <div>
              <h3 className="font-sans text-body font-semibold flex items-center gap-2">
                Transactional Email Bulletins (Maileroo)
                {curEmailEnabled && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
                <span className="rounded-md bg-brand/10 px-2 py-0.5 font-mono text-[11px] font-medium text-brand border border-brand/20">
                  3,000 / mo
                </span>
              </h3>
              <p className="text-body-sm text-text-secondary">
                Dispatch urgent risk bulletins to security teams and exception owners upon policy expiry.
              </p>
            </div>
          </div>
          <Switch
            checked={curEmailEnabled}
            disabled={!isAdmin}
            onCheckedChange={(checked) => setEmailEnabled(checked)}
            aria-label="Toggle Email plugin"
          />
        </div>

        {/* Maileroo tier specs */}
        <div className="grid gap-2 sm:grid-cols-2 text-caption">
          <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-raised font-mono text-[11px] text-text-secondary flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span><strong>Free Tier:</strong> 3,000 emails/mo · 2 custom domains · Webhooks</span>
          </div>
          <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-raised font-mono text-[11px] text-text-secondary flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-brand shrink-0" />
            <span><strong>Production:</strong> $10/mo for 25k emails · HTTP REST &amp; SMTP</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Notification Recipients (comma-separated)</span>
            <Input
              value={curEmailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              placeholder="sre-leads@company.com, ciso-office@company.com"
              className="font-mono text-body-sm rounded-md"
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
              Send weekly Monday morning exception debt digest &amp; expiring waiver bulletin.
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-caption text-text-muted">
            Powered by <a href="https://maileroo.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-primary inline-flex items-center gap-0.5">Maileroo <ExternalLink className="size-3 inline" /></a> HTTP REST &amp; SMTP engine.
          </p>
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
              Save email config
            </Button>
          </div>
        </div>
      </section>

      {/* 3. GitHub CI PR Gate Plugin */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
              <GithubIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-sans text-body font-semibold">
                GitHub CI Pull Request Guard
              </h3>
              <p className="text-body-sm text-text-secondary">
                Block PR merges automatically when AST inspection reveals an unmitigated waiver or high-blast dependency path.
              </p>
            </div>
          </div>
          <span className="rounded-md bg-brand/10 border border-brand/30 px-2 py-0.5 font-mono text-[11px] font-medium text-brand">
            Pre-Merge CI
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-body-sm font-medium text-text-primary">Workflow Configuration: <code className="text-brand font-mono">.github/workflows/reprieve.yml</code></span>
          <div className="relative rounded-lg border border-border-subtle bg-[#090a0f] p-3.5">
            <pre className="font-mono text-caption text-zinc-300 overflow-x-auto leading-relaxed">
{`name: Reprieve Pre-Merge Security Gate
on: [pull_request]
jobs:
  graph-governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan Code Waivers & Dependencies
        run: npx reprieve scan --strict --workspace ${wsId}
        env:
          REPRIEVE_TOKEN: \${{ secrets.REPRIEVE_API_KEY }}`}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2.5 right-2.5 h-7 px-2 font-mono text-[11px] text-zinc-300 hover:text-white"
              onClick={() =>
                copyToClipboard(
                  `name: Reprieve Pre-Merge Security Gate\non: [pull_request]\njobs:\n  graph-governance:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Scan Code Waivers & Dependencies\n        run: npx reprieve scan --strict --workspace ${wsId}\n        env:\n          REPRIEVE_TOKEN: \${{ secrets.REPRIEVE_API_KEY }}`,
                  "github-action"
                )
              }
            >
              {copiedKey === "github-action" ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
              {copiedKey === "github-action" ? "Copied" : "Copy YAML"}
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Enterprise Signed Webhooks (Svix) */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-amber-500/10 text-amber-400">
              <Webhook className="size-5" />
            </div>
            <div>
              <h3 className="font-sans text-body font-semibold flex items-center gap-2">
                Enterprise Outgoing Webhooks (Svix HMAC)
                {curWebhookEnabled && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-body-sm text-text-secondary">
                Publish signed HMAC-SHA256 payloads to Datadog, PagerDuty, Jira, or your enterprise SIEM.
              </p>
            </div>
          </div>
          <Switch
            checked={curWebhookEnabled}
            disabled={!isAdmin}
            onCheckedChange={(checked) => setWebhookEnabled(checked)}
            aria-label="Toggle Webhooks plugin"
          />
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Webhook Listener Endpoint</span>
            <Input
              value={curWebhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://siem.corp.internal/api/v1/reprieve-webhooks"
              className="font-mono text-body-sm rounded-md"
              disabled={!isAdmin}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-[#090a0f] p-3">
            <div className="space-y-0.5">
              <span className="font-mono text-[11px] uppercase text-text-muted">Webhook Signing Secret</span>
              <p className="font-mono text-[12px] text-zinc-300 font-semibold">{data.webhooks.secret}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 font-mono text-[11px]"
              onClick={() => copyToClipboard(data.webhooks.secret, "wh-secret")}
            >
              {copiedKey === "wh-secret" ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
              {copiedKey === "wh-secret" ? "Copied" : "Copy secret"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-caption text-text-muted">
            Includes signature header <code>X-Reprieve-Signature: v1=&lt;hmac&gt;</code> for payload verification.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!curWebhookUrl || testMutation.isPending}
              onClick={() =>
                testMutation.mutate({
                  plugin: "webhooks",
                  config: { endpoint_url: curWebhookUrl, secret: data.webhooks.secret },
                })
              }
            >
              <Send className="mr-1.5 size-3.5" />
              Test handshake
            </Button>
            <Button
              size="sm"
              disabled={!isAdmin || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  webhooks: {
                    enabled: curWebhookEnabled,
                    endpoint_url: curWebhookUrl,
                    secret: data.webhooks.secret,
                  },
                })
              }
            >
              Save webhook config
            </Button>
          </div>
        </div>
      </section>

      {/* 5. Model Context Protocol (MCP) IDE Plugin */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand">
              <Terminal className="size-5" />
            </div>
            <div>
              <h3 className="font-sans text-body font-semibold">
                Model Context Protocol (MCP) IDE Plugin
              </h3>
              <p className="text-body-sm text-text-secondary">
                14 read-only graph reasoning tools for Cursor, Claude Desktop, and VS Code.
              </p>
            </div>
          </div>
          <span className="rounded-md bg-brand/10 border border-brand/30 px-2 py-0.5 font-mono text-[11px] font-medium text-brand">
            14 Tools Ready
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-body-sm font-medium text-text-primary">
            Add to <code className="text-brand font-mono">claude_desktop_config.json</code>:
          </span>
          <div className="relative rounded-lg border border-border-subtle bg-[#090a0f] p-3.5">
            <pre className="font-mono text-caption text-zinc-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "reprieve": {
      "command": "npx",
      "args": ["-y", "reprieve-mcp@latest", "--workspace", "${wsId}"]
    }
  }
}`}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2.5 right-2.5 h-7 px-2 font-mono text-[11px] text-zinc-300 hover:text-white"
              onClick={() =>
                copyToClipboard(
                  `{\n  "mcpServers": {\n    "reprieve": {\n      "command": "npx",\n      "args": ["-y", "reprieve-mcp@latest", "--workspace", "${wsId}"]\n    }\n  }\n}`,
                  "mcp-config"
                )
              }
            >
              {copiedKey === "mcp-config" ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
              {copiedKey === "mcp-config" ? "Copied" : "Copy config"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
