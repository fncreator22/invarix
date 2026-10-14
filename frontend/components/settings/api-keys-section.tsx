"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Copy, Key, Plus, ShieldAlert, Terminal, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ApiKeyCreatedOut, ApiKeyCreateIn, ApiKeyOut, Role } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const ROLE_RANK: Record<Role, number> = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 };

export function ApiKeysSection() {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId, role } = useWorkspace();
  const isAdmin = ROLE_RANK[role] >= ROLE_RANK.admin;

  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedOut | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [keyRole, setKeyRole] = useState<Role>("admin");
  const [expiresDays, setExpiresDays] = useState<number | null>(30);
  const [isTestKey, setIsTestKey] = useState(false);

  const queryKey = ["api-keys", wsId];
  const { data: keys = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api<ApiKeyOut[]>(wsPath(wsId, "/api-keys")),
    enabled: !!wsId && isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ApiKeyCreateIn) =>
      api<ApiKeyCreatedOut>(wsPath(wsId, "/api-keys"), {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey });
      setCreateOpen(false);
      setCreatedKey(data);
      setName("");
      toast.success("API key generated successfully.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) =>
      api(wsPath(wsId, `/api-keys/${keyId}`), {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("API key revoked immediately.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) =>
      api(wsPath(wsId, `/api-keys/${keyId}?permanent=true`), {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("API key deleted.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      toast.success("API key copied to clipboard.");
      setTimeout(() => setCopiedSecret(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a name for this API key.");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      role: keyRole,
      expires_in_days: expiresDays,
      test_key: isTestKey,
    });
  };

  return (
    <div className="space-y-6">
      <section className="card-e1 p-5" aria-label="API Keys">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="font-sans text-h3 font-semibold">API Keys</h2>
            <p className="text-body-sm text-text-secondary mt-1">
              Secure automation tokens for CLI gates, CI/CD pipelines, and Model Context Protocol (MCP) agents.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Generate API Key
            </Button>
          )}
        </div>

        {!isAdmin ? (
          <div className="rounded-md border border-border-subtle bg-bg-muted/30 p-4 text-body-sm text-text-secondary">
            Only workspace administrators and owners can generate or revoke machine API keys.
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-body-sm text-text-muted">Loading API keys...</div>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong p-8 text-center">
            <Key className="mx-auto size-8 text-text-muted mb-2" />
            <h3 className="text-body font-medium">No API keys yet</h3>
            <p className="text-body-sm text-text-secondary mt-1 mb-4">
              Generate an API key to connect the Reprieve CLI circuit breaker or Cursor / Claude MCP.
            </p>
            <Button variant="secondary" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Create First Key
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-bg-muted/40 text-caption font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Key Preview</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-brand-soft/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{k.name}</span>
                        {k.prefix.includes("test") ? (
                          <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                            TEST
                          </Badge>
                        ) : (
                          <Badge variant="low" className="text-[10px] px-1.5 py-0">
                            LIVE
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="rounded bg-bg-muted px-2 py-0.5 font-mono text-caption text-text-secondary">
                        {k.preview}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize text-text-secondary">{k.role}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {k.status === "active" && (
                        <Badge variant="low">Active</Badge>
                      )}
                      {k.status === "expired" && (
                        <Badge variant="moderate">Expired</Badge>
                      )}
                      {k.status === "revoked" && (
                        <Badge variant="critical">Revoked</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-text-muted">
                      {k.created_at ? format(new Date(k.created_at * 1000), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-text-muted">
                      {k.last_used_at ? format(new Date(k.last_used_at * 1000), "MMM d, HH:mm") : "Never"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {k.status === "active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-sev-critical hover:bg-sev-critical-soft hover:text-sev-critical h-8 px-2"
                              disabled={revokeMutation.isPending}
                            >
                              <Trash2 className="size-3.5 mr-1" />
                              Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke this API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Key <strong>{k.name}</strong> ({k.preview}) will be permanently and immediately invalidated.
                                Any CI/CD workflows, CLI gates, or MCP connections using it will stop working.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => revokeMutation.mutate(k.id)}
                                className="bg-sev-critical text-white hover:bg-sev-critical/90"
                              >
                                Revoke Immediately
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-caption text-text-muted capitalize">{k.status}</span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-text-muted hover:text-sev-critical h-8 px-2"
                                disabled={deleteMutation.isPending}
                                title="Delete key"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this API Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Key <strong>{k.name}</strong> ({k.preview}) will be permanently removed from this workspace.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(k.id)}
                                  className="bg-sev-critical text-white hover:bg-sev-critical/90"
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Integration Guide Box */}
      <section className="card-e1 p-5 space-y-3" aria-label="Quick Connect Guide">
        <div className="flex items-center gap-2 text-h4 font-semibold">
          <Terminal className="size-4 text-brand" />
          <span>Automation & CLI Environment Variables</span>
        </div>
        <p className="text-body-sm text-text-secondary">
          Reprieve's pre-merge risk engine and MCP agent read your API key and target workspace from environment variables:
        </p>
        <div className="rounded-md bg-bg-muted/80 p-3.5 font-mono text-body-sm space-y-1.5 border border-border-subtle overflow-x-auto">
          <div className="text-text-muted"># Linux / macOS / GitHub Actions CI:</div>
          <div>export REPRIEVE_API_KEY=&quot;&lt;your-key&gt;&quot;</div>
          <div>export REPRIEVE_WORKSPACE=&quot;{wsId}&quot;</div>
          <div className="text-text-muted mt-2"># Windows PowerShell:</div>
          <div>$env:REPRIEVE_API_KEY=&quot;&lt;your-key&gt;&quot;</div>
          <div>$env:REPRIEVE_WORKSPACE=&quot;{wsId}&quot;</div>
        </div>
      </section>

      {/* Generate API Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Workspace API Key</DialogTitle>
            <DialogDescription>
              Create a machine authentication key scoped specifically to this workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="key-name" className="text-body-sm font-medium">
                Key Label / Description
              </label>
              <Input
                id="key-name"
                placeholder="e.g. GitHub Actions CI, Cursor Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="key-role" className="text-body-sm font-medium">
                Permissions / Role
              </label>
              <select
                id="key-role"
                value={keyRole}
                onChange={(e) => setKeyRole(e.target.value as Role)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {ROLE_RANK[role] >= ROLE_RANK.owner && (
                  <option value="owner">Owner (Full workspace access and admin delegation)</option>
                )}
                {ROLE_RANK[role] >= ROLE_RANK.admin && (
                  <option value="admin">Admin (Full graph &amp; review capabilities)</option>
                )}
                <option value="reviewer">Reviewer (Decide reviews, simulate impacts)</option>
                <option value="member">Member (Propose drafts, inspect graph)</option>
                <option value="viewer">Viewer (Read-only predictions and proof paths)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="key-expiry" className="text-body-sm font-medium">
                Expiration
              </label>
              <select
                id="key-expiry"
                value={expiresDays ?? "never"}
                onChange={(e) =>
                  setExpiresDays(e.target.value === "never" ? null : Number(e.target.value))
                }
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value={30}>30 days (Recommended for CI)</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
                <option value="never">No expiration</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="key-test"
                checked={isTestKey}
                onChange={(e) => setIsTestKey(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="key-test" className="text-body-sm text-text-secondary cursor-pointer">
                Generate as test key (<code className="font-mono text-caption">rep_test_</code> prefix)
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create Secret Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Secret Created Modal (Shown ONCE) */}
      <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sev-low font-semibold">
              <Key className="size-5" />
              API Key Generated Successfully
            </DialogTitle>
            <DialogDescription>
              Copy this secret key immediately. For your security,{" "}
              <strong>it will never be displayed again</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border border-sev-critical-soft bg-sev-critical-soft/20 p-3 flex gap-2.5 items-start">
              <ShieldAlert className="size-4 text-sev-critical shrink-0 mt-0.5" />
              <p className="text-caption text-text-secondary">
                Reprieve stores only a cryptographic SHA-256 hash of this key. If this key is lost, you must generate a new one. If leaked, revoke it immediately in the table below.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-caption font-medium uppercase text-text-muted">Secret API Key</span>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdKey?.secret ?? ""}
                  className="font-mono text-body-sm bg-bg-muted selection:bg-brand-soft select-all"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => createdKey && handleCopySecret(createdKey.secret)}
                  className="shrink-0 gap-1.5"
                >
                  {copiedSecret ? <Check className="size-4 text-sev-low" /> : <Copy className="size-4" />}
                  {copiedSecret ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-caption font-medium uppercase text-text-muted">
                Setup for CLI &amp; MCP
              </span>
              <div className="rounded-md bg-bg-muted p-3 font-mono text-caption text-text-secondary border border-border-subtle overflow-x-auto space-y-1">
                <div className="text-[11px] text-text-muted"># Linux / macOS / GitHub Actions CI:</div>
                <div>export REPRIEVE_API_KEY=&quot;{createdKey?.secret}&quot;</div>
                <div>export REPRIEVE_WORKSPACE=&quot;{wsId}&quot;</div>
                <div className="text-[11px] text-text-muted pt-1"># Windows PowerShell:</div>
                <div>$env:REPRIEVE_API_KEY=&quot;{createdKey?.secret}&quot;</div>
                <div>$env:REPRIEVE_WORKSPACE=&quot;{wsId}&quot;</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setCreatedKey(null);
                setCopiedSecret(false);
              }}
              className="w-full sm:w-auto"
            >
              I Have Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
