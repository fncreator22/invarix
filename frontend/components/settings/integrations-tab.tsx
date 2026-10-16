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

  const [githubEnabled, setGithubEnabled] = useState<boolean | null>(null);
  const [githubRepo, setGithubRepo] = useState<string | null>(null);
  const [githubBlockOnFail, setGithubBlockOnFail] = useState<boolean | null>(null);

  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean | null>(null);
  const [showHmacVerifier, setShowHmacVerifier] = useState(false);
  const [hmacSamplePayload, setHmacSamplePayload] = useState('{"event":"alert.critical","rule_id":"R4"}');
  const [hmacResult, setHmacResult] = useState<{ ts: string; signature: string } | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Enterprise Ecosystem & Integrations Directory */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
            CONNECTED ECOSYSTEM &amp; PLUGINS
          </span>
          <h3 className="font-sans text-body-lg font-bold text-text-primary mt-1">
            Enterprise Developer &amp; SRE Integrations
          </h3>
          <p className="text-body-sm text-text-secondary">
            INVARIX connects directly into your living software engineering pipeline to block cascading risks at PR merge.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* GitHub Actions */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <GitHubBrandLogo className="size-6 text-white" />
              <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", curGithubEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400")}>
                {curGithubEnabled ? "Active Gate" : "Ready"}
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">GitHub Actions</span>
              <span className="text-[11px] text-text-muted">Pre-merge CI gate</span>
            </div>
          </div>

          {/* Slack */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <SlackBrandLogo className="size-6" />
              <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", curSlackEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400")}>
                {curSlackEnabled ? "Connected" : "Ready"}
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">Slack</span>
              <span className="text-[11px] text-text-muted">Incident channel alerts</span>
            </div>
          </div>

          {/* Jira Software */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <JiraBrandLogo className="size-6" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Connected
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">Jira Software</span>
              <span className="text-[11px] text-text-muted">Waiver issue sync</span>
            </div>
          </div>

          {/* PagerDuty */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <PagerDutyBrandLogo className="size-6" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Connected
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">PagerDuty</span>
              <span className="text-[11px] text-text-muted">Escalation policies</span>
            </div>
          </div>

          {/* Datadog */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <DatadogBrandLogo className="size-6" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Connected
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">Datadog</span>
              <span className="text-[11px] text-text-muted">APM &amp; topology metrics</span>
            </div>
          </div>

          {/* GitLab */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <GitLabBrandLogo className="size-6" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Ready
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">GitLab CI</span>
              <span className="text-[11px] text-text-muted">Merge request scanner</span>
            </div>
          </div>

          {/* ServiceNow */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <ServiceNowBrandLogo className="size-6" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Connected
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">ServiceNow</span>
              <span className="text-[11px] text-text-muted">CAB waiver governance</span>
            </div>
          </div>

          {/* Svix Signed Webhooks */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-border-subtle bg-surface-raised hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between">
              <SvixBrandLogo className="size-6" />
              <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", curWebhookEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400")}>
                {curWebhookEnabled ? "Active" : "Ready"}
              </span>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-body-sm text-text-primary block">Svix Webhooks</span>
              <span className="text-[11px] text-text-muted">HMAC-SHA256 bus</span>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Slack / Discord Webhook Plugin */}
      <section className="card-e1 p-5 rounded-xl border border-border-subtle bg-surface space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-[#4A154B]/20">
              <SlackBrandLogo className="size-6" />
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
              <GitHubBrandLogo className="size-6 text-white" />
            </div>
            <div>
              <h3 className="font-sans text-body font-semibold flex items-center gap-2">
                GitHub CI Pull Request Guard
                {curGithubEnabled && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    Active Gate
                  </span>
                )}
              </h3>
              <p className="text-body-sm text-text-secondary">
                Block PR merges automatically when AST inspection reveals an unmitigated waiver or high-blast dependency path.
              </p>
            </div>
          </div>
          <Switch
            checked={curGithubEnabled}
            disabled={!isAdmin}
            onCheckedChange={(checked) => setGithubEnabled(checked)}
            aria-label="Toggle GitHub Actions CI gate"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-body-sm">
            <span className="font-medium text-text-primary">Target GitHub Repository</span>
            <Input
              value={curGithubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="e.g. northwind-corp/payments-core"
              className="font-mono text-body-sm rounded-md"
              disabled={!isAdmin}
            />
          </label>
          <div className="flex flex-col justify-end">
            <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-raised p-3">
              <div className="space-y-0.5">
                <span className="text-body-sm font-medium text-text-primary">Strict Pre-Merge Gate</span>
                <p className="text-caption text-text-muted">
                  Fail workflow exit code (1) if critical debt or ghost owner is found.
                </p>
              </div>
              <Switch
                checked={curGithubBlockOnFail}
                disabled={!isAdmin}
                onCheckedChange={(checked) => setGithubBlockOnFail(checked)}
                aria-label="Toggle strict block on fail"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              Workflow Configuration: <code className="text-brand font-mono">.github/workflows/invarix.yml</code>
            </span>
            <Button
              size="sm"
              disabled={!isAdmin || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  github: {
                    enabled: curGithubEnabled,
                    repo: curGithubRepo,
                    block_on_fail: curGithubBlockOnFail,
                  },
                })
              }
            >
              Save GitHub CI config
            </Button>
          </div>
          <div className="relative rounded-lg border border-border-subtle bg-[#090a0f] p-3.5">
            <pre className="font-mono text-caption text-zinc-300 overflow-x-auto leading-relaxed">
{`name: INVARIX Pre-Merge Security Gate
on: [pull_request]
jobs:
  graph-governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan Code Waivers & Dependencies
        run: npx invarix scan ${curGithubBlockOnFail ? "--strict" : "--warn"} --workspace ${wsId}
        env:
          INVARIX_TOKEN: \${{ secrets.INVARIX_API_KEY }}`}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2.5 right-2.5 h-7 px-2 font-mono text-[11px] text-zinc-300 hover:text-white"
              onClick={() =>
                copyToClipboard(
                  `name: INVARIX Pre-Merge Security Gate\non: [pull_request]\njobs:\n  graph-governance:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Scan Code Waivers & Dependencies\n        run: npx invarix scan ${curGithubBlockOnFail ? "--strict" : "--warn"} --workspace ${wsId}\n        env:\n          INVARIX_TOKEN: \${{ secrets.INVARIX_API_KEY }}`,
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
              placeholder="https://siem.corp.internal/api/v1/invarix-webhooks"
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
            Includes signature header <code>X-INVARIX-Signature: v1=&lt;hmac&gt;</code> and <code>X-INVARIX-Timestamp</code>.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHmacVerifier(!showHmacVerifier)}
            >
              {showHmacVerifier ? "Hide HMAC Inspector" : "Verify HMAC Signature"}
            </Button>
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

        {/* HMAC Signature Verification & Inspector */}
        {showHmacVerifier && (
          <div className="mt-4 rounded-lg border border-border-strong bg-[#090a0f] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="font-sans text-body-sm font-semibold text-text-primary flex items-center gap-2">
                <span>HMAC Header Verification (<code className="text-brand">X-INVARIX-Signature</code>)</span>
              </h4>
              <span className="font-mono text-[11px] text-zinc-400">Algorithm: HMAC-SHA256</span>
            </div>

            <p className="text-caption text-text-secondary leading-relaxed">
              Every webhook sent by INVARIX signs the raw payload with your secret using standard Svix HMAC-SHA256:
              <br />
              <code className="text-brand font-mono text-[11px]">Signature = HMAC_SHA256(secret, &quot;$&#123;timestamp&#125;.$&#123;raw_payload&#125;&quot;)</code>
            </p>

            <div className="space-y-2">
              <label className="block text-caption font-medium text-text-muted">
                Test Payload JSON:
              </label>
              <textarea
                rows={2}
                value={hmacSamplePayload}
                onChange={(e) => setHmacSamplePayload(e.target.value)}
                className="w-full rounded border border-border-subtle bg-surface p-2 font-mono text-caption text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => computeHmac(data.webhooks.secret, hmacSamplePayload)}
                className="text-xs"
              >
                Compute &amp; Verify Signature
              </Button>
            </div>

            {hmacResult && (
              <div className="space-y-2 pt-2 border-t border-white/10 text-caption font-mono">
                <div className="flex items-center justify-between bg-surface p-2 rounded border border-border-subtle">
                  <span className="text-zinc-400">X-INVARIX-Timestamp:</span>
                  <span className="text-zinc-200">{hmacResult.ts}</span>
                </div>
                <div className="flex items-center justify-between bg-surface p-2 rounded border border-border-subtle">
                  <span className="text-zinc-400">X-INVARIX-Signature:</span>
                  <span className="text-emerald-400 break-all ml-2">{hmacResult.signature}</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <span className="text-caption font-medium text-text-muted">Verification code snippet (Python / Fastify):</span>
              <pre className="mt-1 font-mono text-[11px] text-zinc-400 bg-surface/60 p-2.5 rounded border border-border-subtle overflow-x-auto">
{`# Python verification:
import hmac, hashlib
sig = hmac.new(secret.encode(), f"{timestamp}.{raw_body}".encode(), hashlib.sha256).hexdigest()
is_valid = hmac.compare_digest(f"v1={sig}", request_signature)`}
              </pre>
            </div>
          </div>
        )}
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
    "invarix": {
      "command": "npx",
      "args": ["-y", "invarix-mcp@latest", "--workspace", "${wsId}"]
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
                  `{\n  "mcpServers": {\n    "invarix": {\n      "command": "npx",\n      "args": ["-y", "invarix-mcp@latest", "--workspace", "${wsId}"]\n    }\n  }\n}`,
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
