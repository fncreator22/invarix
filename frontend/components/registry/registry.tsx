"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { selectClass, type ControlRow } from "@/components/exceptions/shared";
import { PageContainer, PageHeader } from "@/components/page-header";
import { RelativeDate } from "@/components/relative-date";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { ScoreRing } from "@/components/score-ring";
import { useEntityDrawer } from "@/components/shell/use-drawer";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ExceptionOut, Page, PersonRow, Ref, ServiceRisk, ServiceRiskDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

type Kind = "services" | "people" | "teams" | "controls";
const TABS: [Kind, string][] = [
  ["services", "Services"],
  ["people", "People"],
  ["teams", "Teams"],
  ["controls", "Controls"],
];
type TeamRow = { id: string; name: string; services: Ref[]; leads: Ref[]; members: number };
const ROLE_RANK = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 } as const;

function useList<T>(kind: Kind) {
  const api = useApi();
  const { wsId } = useWorkspace();
  return useQuery({ queryKey: [kind, wsId], queryFn: ({ signal }) => api<T[]>(wsPath(wsId, `/${kind}`), { signal }) });
}

/** SCR-P-09..P-11 shared frame: tabs + Add (admin). */
function RegistryFrame({ kind, children }: { kind: Kind; children: ReactNode }) {
  const { slug, role } = useWorkspace();
  const [adding, setAdding] = useState(false);
  return (
    <PageContainer>
      <PageHeader
        title="Registry"
        subtitle="The org graph Sentinel reasons over: services, people, teams and controls."
        actions={
          ROLE_RANK[role] >= ROLE_RANK.admin && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus aria-hidden className="size-4" /> Add {kind === "people" ? "person" : kind.slice(0, -1)}
            </Button>
          )
        }
      />
      <nav className="flex gap-1 border-b border-border-subtle" aria-label="Registry">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/w/${slug}/${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-body-sm font-medium",
              k === kind ? "border-brand text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
      <AddSheet kind={kind} open={adding} onClose={() => setAdding(false)} />
    </PageContainer>
  );
}

function Table({ head, rows, loading, error }: { head: string[]; rows: ReactNode[][]; loading: boolean; error: unknown }) {
  if (loading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  if (error) return <p className="text-text-secondary">{errorMessage(error)}</p>;
  return (
    <div className="card-e1 overflow-x-auto">
      <table className="w-full min-w-[600px] text-body-sm">
        <thead className="bg-sunken text-left text-text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-brand-soft">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-2.5">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ServicesList() {
  const { slug } = useWorkspace();
  const q = useList<ServiceRisk>("services");
  return (
    <RegistryFrame kind="services">
      <Table
        head={["Service", "Risk", "Tier", "Team", "Active exceptions"]}
        loading={q.isPending}
        error={q.error}
        rows={(q.data ?? []).map((s) => [
          <Link key="n" href={`/w/${slug}/services/${s.service.id}`} className="font-medium hover:underline">
            {s.service.label}
            {s.customer_facing && <span className="ml-2 rounded-full bg-brand-soft px-2 text-caption">customer-facing</span>}
          </Link>,
          <ScoreRing key="s" score={s.score} band={s.band} size="sm" />,
          s.tier,
          s.team?.label ?? "—",
          s.active_exceptions,
        ])}
      />
    </RegistryFrame>
  );
}

export function PeopleList() {
  const { slug } = useWorkspace();
  const q = useList<PersonRow>("people");
  return (
    <RegistryFrame kind="people">
      <Table
        head={["Person", "Title", "Teams", "Status", "Owns (active)"]}
        loading={q.isPending}
        error={q.error}
        rows={(q.data ?? []).map((p) => [
          <Link key="n" href={`/w/${slug}/people/${p.id}`} className="font-medium hover:underline">
            {p.name}
          </Link>,
          p.title ?? "—",
          p.teams.map((t) => t.label).join(", ") || "—",
          p.status === "left" ? <span key="s" className="rounded-full bg-sev-critical-soft px-2 text-caption text-sev-critical">Left</span> : "Active",
          p.owned_active || "",
        ])}
      />
    </RegistryFrame>
  );
}

export function TeamsList() {
  const q = useList<TeamRow>("teams");
  const { open } = useEntityDrawer();
  return (
    <RegistryFrame kind="teams">
      <Table
        head={["Team", "Lead", "Members", "Services"]}
        loading={q.isPending}
        error={q.error}
        rows={(q.data ?? []).map((t) => [
          <button key="n" type="button" onClick={() => open(t.id)} className="font-medium hover:underline">
            {t.name}
          </button>,
          t.leads.map((l) => l.label).join(", ") || "—",
          t.members,
          t.services.map((s) => s.label).join(", "),
        ])}
      />
    </RegistryFrame>
  );
}

export function ControlsList() {
  const q = useList<ControlRow>("controls");
  const { open } = useEntityDrawer();
  return (
    <RegistryFrame kind="controls">
      <Table
        head={["Control", "Framework", "Active waivers"]}
        loading={q.isPending}
        error={q.error}
        rows={(q.data ?? []).map((c) => [
          <button key="n" type="button" onClick={() => open(c.id)} className="font-medium hover:underline">
            {c.name}
          </button>,
          c.framework ?? "—",
          c.active_waivers || "",
        ])}
      />
    </RegistryFrame>
  );
}

type ServiceOut = { id: string; name: string; tier: number; description?: string; team: Ref | null; depends_on: Ref[]; depended_on_by: Ref[]; customer_paths: Ref[] };

export function ServiceDetail({ id }: { id: string }) {
  const api = useApi();
  const { wsId, slug, asOf } = useWorkspace();
  const svc = useQuery({ queryKey: ["service", wsId, id], queryFn: ({ signal }) => api<ServiceOut>(wsPath(wsId, `/services/${id}`), { signal }) });
  const risk = useQuery({ queryKey: ["risk-service", wsId, id], queryFn: ({ signal }) => api<ServiceRiskDetail>(wsPath(wsId, `/risk/services/${id}`), { signal }) });
  const exc = useQuery({
    queryKey: ["exceptions", wsId, { service_id: id }],
    queryFn: ({ signal }) => api<Page<ExceptionOut>>(wsPath(wsId, "/exceptions"), { signal, query: { service_id: id, status: "active", limit: 50 } }),
  });
  if (svc.isPending) return <PageContainer><Skeleton className="h-64" /></PageContainer>;
  if (svc.isError) return <PageContainer><p className="text-text-secondary">{errorMessage(svc.error)}</p></PageContainer>;
  const s = svc.data;
  return (
    <PageContainer>
      <PageHeader
        eyebrow={<Link href={`/w/${slug}/services`} className="hover:underline">Services</Link>}
        title={s.name}
        subtitle={`Tier ${s.tier} · ${s.team?.label ?? "No owning team"}${s.description ? ` · ${s.description}` : ""}`}
        actions={<Button asChild variant="secondary"><Link href={`/w/${slug}/graph?focus=${s.id}`}>Open on graph</Link></Button>}
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card title="Risk" className="lg:col-span-5">
          {risk.data ? (
            <div className="space-y-4">
              <ScoreRing score={risk.data.score} band={risk.data.band} size="md" />
              <ScoreBreakdown breakdown={risk.data.breakdown} names={risk.data.names} limit={5} />
            </div>
          ) : <Skeleton className="h-40" />}
        </Card>
        <div className="space-y-6 lg:col-span-7">
          <Card title="Dependencies">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
              <RefRow label="Depends on" refs={s.depends_on} href={(r) => `/w/${slug}/services/${r.id}`} />
              <RefRow label="Used by" refs={s.depended_on_by} href={(r) => `/w/${slug}/services/${r.id}`} />
              <RefRow label="Customer paths" refs={s.customer_paths} />
            </dl>
          </Card>
          <Card title={`Active exceptions on this service (${exc.data?.items.length ?? "…"})`}>
            <ul className="divide-y divide-border-subtle">
              {exc.data?.items.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                  <Link href={`/w/${slug}/exceptions/${e.id}`} className="truncate hover:underline">{e.title}</Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusChip status={e.effective_status} date={e.expires_at} />
                    <RelativeDate value={e.expires_at} asOf={asOf} className="text-text-muted" />
                  </span>
                </li>
              ))}
              {exc.data?.items.length === 0 && <li className="py-2 text-body-sm text-text-muted">None directly on this service.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

type PersonOut = PersonRow & {
  memberships: { team_id: string; team: string; since: number; until: number | null }[];
  leads: { team_id: string; team: string; since: number; until: number | null }[];
  owned: { id: string; name: string; status: string }[];
  relied_on_by: Ref[];
};

export function PersonDetail({ id }: { id: string }) {
  const api = useApi();
  const { wsId, slug } = useWorkspace();
  const p = useQuery({ queryKey: ["person", wsId, id], queryFn: ({ signal }) => api<PersonOut>(wsPath(wsId, `/people/${id}`), { signal }) });
  if (p.isPending) return <PageContainer><Skeleton className="h-64" /></PageContainer>;
  if (p.isError) return <PageContainer><p className="text-text-secondary">{errorMessage(p.error)}</p></PageContainer>;
  const d = p.data;
  const active = d.owned.filter((o) => o.status === "active");
  const span = (m: { since: number; until: number | null }) =>
    `${new Date(m.since * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${m.until ? new Date(m.until * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "now"}`;
  return (
    <PageContainer>
      <PageHeader eyebrow={<Link href={`/w/${slug}/people`} className="hover:underline">People</Link>} title={d.name} subtitle={[d.title, d.email, d.status === "left" && "Has left the company"].filter(Boolean).join(" · ")} />
      {d.status === "left" && active.length > 0 && (
        <p role="alert" className="rounded-md border border-sev-critical bg-sev-critical-soft px-4 py-3 text-body-sm">
          {d.name} has left but still owns {active.length} active exception{active.length > 1 ? "s" : ""}. Open the related ghost-owner alerts to reassign.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Teams over time">
          <ul className="space-y-2 text-body-sm">
            {d.memberships.map((m, i) => <li key={`m${i}`}>Member of <strong>{m.team}</strong> <span className="text-text-muted">({span(m)})</span></li>)}
            {d.leads.map((m, i) => <li key={`l${i}`}>Leads <strong>{m.team}</strong> <span className="text-text-muted">({span(m)})</span></li>)}
          </ul>
        </Card>
        <Card title={`Owns ${active.length} active exception${active.length === 1 ? "" : "s"}`}>
          <ul className="space-y-1.5 text-body-sm">
            {d.owned.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <Link href={`/w/${slug}/exceptions/${o.id}`} className="truncate hover:underline">{o.name}</Link>
                <span className="text-caption text-text-muted">{o.status}</span>
              </li>
            ))}
            {!d.owned.length && <li className="text-text-muted">None.</li>}
          </ul>
        </Card>
        <Card title="Fallback for">
          {d.relied_on_by.length ? (
            <>
              <p className="mb-2 text-body-sm text-text-secondary">Relied on by {d.relied_on_by.length} compensating control{d.relied_on_by.length > 1 ? "s" : ""}.</p>
              <ul className="list-disc space-y-1 pl-5 text-body-sm">{d.relied_on_by.map((r) => <li key={r.id}>{r.label}</li>)}</ul>
            </>
          ) : <p className="text-body-sm text-text-muted">No compensating control relies on this person.</p>}
        </Card>
      </div>
    </PageContainer>
  );
}

function AddSheet({ kind, open, onClose }: { kind: Kind; open: boolean; onClose: () => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const { wsId } = useWorkspace();
  const teams = useQuery({ queryKey: ["teams", wsId], queryFn: ({ signal }) => api<TeamRow[]>(wsPath(wsId, "/teams"), { signal }), enabled: open && (kind === "services" || kind === "people") });
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => api(wsPath(wsId, `/${kind}`), { method: "POST", body: { ...form, ...(kind === "services" && { tier: Number(form.tier ?? 2) }), ...(kind === "controls" && { severity_weight: Number(form.severity_weight ?? 3) }) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind, wsId] });
      toast.success("Saved. Sentinel will re-check the graph.");
      setForm({});
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const text = (k: string, label: string, required = false) => (
    <label className="block space-y-1.5 text-body-sm">
      <span className="font-medium">{label}</span>
      <Input value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} required={required} />
    </label>
  );
  const teamPick = (
    <label className="block space-y-1.5 text-body-sm">
      <span className="font-medium">{kind === "services" ? "Owning team" : "Team"}</span>
      <select value={String(form.team_id ?? "")} onChange={(e) => set("team_id", e.target.value)} className={selectClass}>
        <option value="">None</option>
        {teams.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
  );
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
          <SheetHeader>
            <SheetTitle>Add {kind === "people" ? "person" : kind.slice(0, -1)}</SheetTitle>
            <SheetDescription>Changes rerun detection automatically.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            {text("name", "Name", true)}
            {kind === "services" && (
              <>
                <label className="block space-y-1.5 text-body-sm">
                  <span className="font-medium">Tier</span>
                  <select value={String(form.tier ?? 2)} onChange={(e) => set("tier", e.target.value)} className={selectClass}>
                    <option value="1">1 · critical</option>
                    <option value="2">2 · important</option>
                    <option value="3">3 · supporting</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-body-sm">
                  <input type="checkbox" checked={Boolean(form.customer_facing)} onChange={(e) => set("customer_facing", e.target.checked)} /> Customer-facing
                </label>
                {teamPick}
                {text("description", "Description")}
              </>
            )}
            {kind === "people" && (
              <>
                {text("email", "Email")}
                {text("title", "Title")}
                {teamPick}
              </>
            )}
            {kind === "controls" && (
              <>
                {text("framework", "Framework (e.g. SOC 2 CC6.1)")}
                <label className="block space-y-1.5 text-body-sm">
                  <span className="font-medium">Weight (1–5)</span>
                  <Input type="number" min={1} max={5} value={String(form.severity_weight ?? 3)} onChange={(e) => set("severity_weight", e.target.value)} />
                </label>
              </>
            )}
          </div>
          <SheetFooter>
            <Button type="submit" loading={save.isPending} disabled={!String(form.name ?? "").trim()}>Save</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Card({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("card-e1 p-4 md:p-5", className)} aria-label={title}>
      <h2 className="mb-3 font-sans text-h3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function RefRow({ label, refs, href }: { label: string; refs: Ref[]; href?: (r: Ref) => string }) {
  const { open } = useEntityDrawer();
  return (
    <>
      <dt className="text-body-sm text-text-muted">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {refs.length ? refs.map((r) =>
          href ? (
            <Link key={r.id} href={href(r)} className="rounded-full border border-border-subtle px-2.5 py-0.5 text-body-sm hover:border-brand">{r.label}</Link>
          ) : (
            <button key={r.id} type="button" onClick={() => open(r.id)} className="rounded-full border border-border-subtle px-2.5 py-0.5 text-body-sm hover:border-brand">{r.label}</button>
          ),
        ) : <span className="text-body-sm text-text-muted">—</span>}
      </dd>
    </>
  );
}

