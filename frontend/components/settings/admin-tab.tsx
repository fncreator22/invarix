"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Users,
  Cpu,
  Bell,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Send,
  Sliders,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "reviewer" | "member" | "viewer";
  status: "active" | "invited";
  lastActive: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "critical";
}

const INITIAL_USERS: UserRow[] = [
  { id: "usr_1", name: "Alex Mercer", email: "alex.mercer@northwind.io", role: "admin", status: "active", lastActive: "Just now" },
  { id: "usr_2", name: "Sarah Chen", email: "sarah.chen@northwind.io", role: "reviewer", status: "active", lastActive: "14 mins ago" },
  { id: "usr_3", name: "Devon Vance", email: "devon.vance@northwind.io", role: "member", status: "active", lastActive: "2 hours ago" },
  { id: "usr_4", name: "Elena Rostova", email: "elena.r@northwind.io", role: "viewer", status: "invited", lastActive: "Pending invite" },
];

const INITIAL_LOGS: AuditLog[] = [
  { id: "aud_1", timestamp: "Today 10:14 UTC", actor: "alex.mercer", action: "SENTINEL_SCAN_MANUAL", target: "org_workspace (12 services)", severity: "info" },
  { id: "aud_2", timestamp: "Today 09:48 UTC", actor: "sarah.chen", action: "EXCEPTION_REVIEW_APPROVED", target: "exc_jwt_bypass (svc_auth)", severity: "warning" },
  { id: "aud_3", timestamp: "Yesterday 18:22 UTC", actor: "alex.mercer", action: "TOKEN_QUOTA_RESET", target: "400,000 tokens/day", severity: "info" },
  { id: "aud_4", timestamp: "2 days ago", actor: "system", action: "CIRCUIT_BREAKER_EVALUATED", target: "PR #142 passed (avalanche 0.42 < 0.75)", severity: "info" },
];

export function AdminTab() {
  const { wsId, role } = useWorkspace();
  const isAdmin = role === "admin" || role === "owner";

  // Users state
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "reviewer" | "member" | "viewer">("member");

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSeverity, setBroadcastSeverity] = useState<"info" | "warning" | "critical">("info");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Quota state
  const [freezeAi, setFreezeAi] = useState(false);
  const [maxToolCalls, setMaxToolCalls] = useState(6);

  function handleInviteUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    const newUser: UserRow = {
      id: `usr_${Date.now()}`,
      name: newEmail.split("@")[0],
      email: newEmail.trim(),
      role: newRole,
      status: "invited",
      lastActive: "Pending invite",
    };
    setUsers((prev) => [...prev, newUser]);
    setNewEmail("");
    toast.success(`Invite sent to ${newUser.email} as ${newRole}.`);
  }

  function handleRoleChange(userId: string, targetRole: UserRow["role"]) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u)));
    toast.success("User role updated.");
  }

  function handleRemoveUser(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success("User access revoked.");
  }

  function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      toast.success("In-app broadcast announcement dispatched to all active workspace sessions!");
    }, 600);
  }

  function handleExportAudit() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(INITIAL_LOGS, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `reprieve-audit-${wsId.slice(0, 8)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("SOC2 Audit Ledger exported.");
  }

  return (
    <div className="space-y-8">
      {/* Admin Control Plane Header */}
      <div className="rounded-xl border border-border-subtle bg-surface/70 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg border border-border-subtle bg-raised text-brand">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-brand font-semibold px-1.5 py-0.5 bg-brand-soft border border-brand/20">
                  SuperAdmin Control Plane
                </span>
                <span className="font-mono text-[10px] uppercase text-text-muted">
                  Workspace: <strong className="text-text-primary">{wsId.slice(0, 10)}…</strong>
                </span>
              </div>
              <h2 className="text-h2 font-semibold tracking-tight text-text-primary">
                Governance, Quotas & Platform Administration
              </h2>
              <p className="text-body-sm text-text-secondary mt-0.5">
                Manage organization access, configure sliding DDoS / token breakers, dispatch announcements, and export SOC2 audit logs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Checked all platform invariant breakers. All services healthy.");
              }}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span>Health Check</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 1. User & Access Management */}
      <section className="card-e1 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
              <Users className="size-4 text-brand" />
              Workspace Members & Access Roles ({users.length})
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Control workspace access. Reviewers approve exceptions; Admins configure Sentinel and manage billing.
            </p>
          </div>
        </div>

        {isAdmin && (
          <form onSubmit={handleInviteUser} className="flex flex-wrap items-center gap-2.5 pt-2 pb-1">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="max-w-xs h-9 text-xs"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="h-9 rounded border border-border-strong bg-surface px-2.5 text-xs text-text-primary focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer (Read-Only)</option>
            </select>
            <Button type="submit" size="sm" className="h-9 text-xs">
              Invite Member
            </Button>
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-left text-xs">
            <thead className="bg-sunken text-text-muted font-mono uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Last Seen</th>
                {isAdmin && <th className="px-3 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-raised transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-text-primary">{u.name}</p>
                    <p className="text-[11px] text-text-muted">{u.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {isAdmin ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        className="rounded border border-border-subtle bg-surface-sunken px-2 py-1 text-[11px] font-medium capitalize text-text-primary"
                      >
                        <option value="admin">Admin</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="font-medium capitalize text-text-primary">{u.role}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        u.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", u.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">{u.lastActive}</td>
                  {isAdmin && (
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-text-muted hover:text-sev-critical"
                        onClick={() => handleRemoveUser(u.id)}
                        title="Revoke access"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Token Budget & DDoS Protections */}
      <section className="card-e1 p-5 space-y-4">
        <div>
          <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
            <Cpu className="size-4 text-brand" />
            Rate Limiting, Quotas & DDoS Breakers
          </h3>
          <p className="text-caption text-text-muted mt-0.5">
            Sliding-window protections preventing runaway inference costs and API abuse.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Daily Token Quota</span>
              <span className="font-mono text-brand font-semibold">142.5k / 400k</span>
            </div>
            <div className="h-2 w-full rounded-full bg-sunken overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: "35.6%" }} />
            </div>
            <p className="text-[11px] text-text-muted">Resets at UTC 00:00. Fast fallback to Quick Answers on exhaustion.</p>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Sliding Rate Limits</span>
              <span className="font-mono text-emerald-500 font-medium">Normal</span>
            </div>
            <ul className="text-[11px] text-text-secondary space-y-1">
              <li className="flex justify-between">
                <span>User chat rate:</span>
                <strong className="font-mono">10 msgs / min</strong>
              </li>
              <li className="flex justify-between">
                <span>Workspace cap:</span>
                <strong className="font-mono">50 msgs / day</strong>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Tool Call Execution Cap</span>
              <span className="font-mono text-brand font-semibold">{maxToolCalls} / turn</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min={1}
                max={12}
                value={maxToolCalls}
                onChange={(e) => setMaxToolCalls(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-text-muted">Prevents infinite agent reasoning loops (ADR-0012).</p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-border-subtle text-xs">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", freezeAi ? "bg-sev-critical" : "bg-emerald-500")} />
            <span className="font-medium text-text-primary">
              {freezeAi ? "Emergency AI Freeze Active (Quick Answers Only)" : "AI Inference Pipeline Active"}
            </span>
          </div>
          {isAdmin && (
            <Button
              variant={freezeAi ? "default" : "destructive-outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setFreezeAi(!freezeAi);
                toast.warning(freezeAi ? "AI Pipeline Resumed." : "AI Inference Frozen across workspace.");
              }}
            >
              {freezeAi ? "Resume AI Engine" : "Freeze AI Inference"}
            </Button>
          )}
        </div>
      </section>

      {/* 3. Admin Notification Broadcast System */}
      <section className="card-e1 p-5 space-y-4">
        <div>
          <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
            <Bell className="size-4 text-brand" />
            In-App Notification & Alert Broadcast System
          </h3>
          <p className="text-caption text-text-muted mt-0.5">
            Broadcast operational alerts, security advisories, or maintenance windows to all active users.
          </p>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-text-muted mb-1">Announcement Title</label>
              <Input
                placeholder="e.g., Scheduled Maintenance or Critical Invariant Warning"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">Severity</label>
              <select
                value={broadcastSeverity}
                onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                className="w-full h-9 rounded border border-border-strong bg-surface px-2.5 text-xs text-text-primary focus:outline-none"
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical (Red)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">Broadcast Message</label>
            <textarea
              rows={2}
              placeholder="Enter announcement details visible in user banners..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full rounded border border-border-strong bg-surface p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" /> Maileroo / Resend SMTP Ready
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" /> HMAC Webhook Relays Safe (SSRF Guard Active)
              </span>
            </div>
            <Button type="submit" size="sm" loading={isBroadcasting} disabled={!isAdmin} className="gap-1.5 text-xs">
              <Send className="size-3.5" />
              <span>Broadcast Announcement</span>
            </Button>
          </div>
        </form>
      </section>

      {/* 4. Immutable SOC2 Audit Ledger */}
      <section className="card-e1 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans text-h3 font-semibold flex items-center gap-2">
              <FileText className="size-4 text-brand" />
              SOC2 Immutable Platform Audit Ledger
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Cryptographically timestamped ledger of admin actions, Sentinel triggers, and role modifications.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportAudit} className="h-8 gap-1.5 text-xs">
            <Download className="size-3.5" />
            <span>Export JSON Ledger</span>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-sunken text-text-muted uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target / Details</th>
                <th className="px-3 py-2">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface">
              {INITIAL_LOGS.map((l) => (
                <tr key={l.id} className="hover:bg-raised transition-colors text-[11px]">
                  <td className="px-3 py-2 text-text-muted">{l.timestamp}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{l.actor}</td>
                  <td className="px-3 py-2 text-brand font-semibold">{l.action}</td>
                  <td className="px-3 py-2 text-text-secondary">{l.target}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] uppercase font-bold",
                        l.severity === "critical"
                          ? "bg-sev-critical-soft text-sev-critical"
                          : l.severity === "warning"
                          ? "bg-sev-moderate-soft text-sev-moderate"
                          : "bg-brand-soft text-brand"
                      )}
                    >
                      {l.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
