"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { KIND_LABEL, fromDay, selectClass, toDay, useLookups } from "@/components/exceptions/shared";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isApiError, useApi, wsPath } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useNowSeconds } from "@/lib/hooks";
import type { ExceptionKind, ExceptionOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const DAY = 86400;
const ROLE_RANK = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 } as const;

/** SCR-P-06 (basic): create an exception. Members save drafts; reviewers can save and activate. */
export function ExceptionForm() {
  const api = useApi();
  const router = useRouter();
  const { wsId, slug, asOf, role } = useWorkspace();
  const now = useNowSeconds();
  const today = asOf ?? now;
  const { people, services, controls, loading } = useLookups();
  const [f, setF] = useState({
    title: "",
    kind: "security_waiver" as ExceptionKind,
    severity: 3,
    granted: toDay(today),
    expires: toDay(today + 30 * DAY),
    owner_id: "",
    approver_id: "",
    control_id: "",
    service_ids: [] as string[],
    description: "",
    evidence_ref: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: (activate: boolean) =>
      api<ExceptionOut>(wsPath(wsId, "/exceptions"), {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: {
          title: f.title.trim(),
          kind: f.kind,
          severity: f.severity,
          granted_at: fromDay(f.granted),
          expires_at: fromDay(f.expires),
          description: f.description.trim() || undefined,
          control_id: f.control_id,
          service_ids: f.service_ids,
          owner_id: f.owner_id,
          approver_id: f.approver_id || undefined,
          evidence: f.evidence_ref.trim() ? [{ kind: "ticket", source_ref: f.evidence_ref.trim() }] : [],
          activate,
        },
      }),
    onSuccess: (e) => {
      toast.success(e.status === "active" ? "Exception active. Sentinel will check it." : "Draft saved.");
      router.push(`/w/${slug}/exceptions/${e.id}`);
    },
    onError: (e) => {
      if (isApiError(e) && e.errors.length) setErrors(e.fieldErrors);
      toast.error(errorMessage(e));
    },
  });

  const submit = (activate: boolean) => {
    const local: Record<string, string> = {};
    if (f.title.trim().length < 3) local.title = "At least 3 characters";
    if (f.expires <= f.granted) local.expires_at = "Must be after the granted date";
    if (!f.owner_id) local.owner_id = "Pick an owner";
    if (!f.control_id) local.control_id = "Pick the waived control";
    if (!f.service_ids.length) local.service_ids = "Pick at least one service";
    setErrors(local);
    if (Object.keys(local).length) {
      document.getElementById(Object.keys(local)[0])?.focus();
      return;
    }
    save.mutate(activate);
  };

  return (
    <PageContainer>
      <PageHeader title="New exception" subtitle="A temporary promise to deviate from a control, with an owner and an end date." />
      <form className="card-e1 max-w-2xl space-y-5 p-5" onSubmit={(e) => (e.preventDefault(), submit(false))} noValidate>
        <Field id="title" label="Title" error={errors.title}>
          <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="kind" label="Kind">
            <select id="kind" value={f.kind} onChange={(e) => set("kind", e.target.value as ExceptionKind)} className={selectClass}>
              {Object.entries(KIND_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field id="severity" label="Severity (1 low – 5 critical)">
            <div role="radiogroup" aria-label="Severity" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={f.severity === n}
                  onClick={() => set("severity", n)}
                  className={cn("h-10 flex-1 rounded-md border text-body font-medium", f.severity === n ? "border-brand bg-brand-soft" : "border-border-strong")}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field id="granted" label="Granted">
            <Input id="granted" type="date" value={f.granted} onChange={(e) => set("granted", e.target.value)} />
          </Field>
          <Field id="expires_at" label="Expires" error={errors.expires_at}>
            <Input id="expires_at" type="date" value={f.expires} min={f.granted} onChange={(e) => set("expires", e.target.value)} />
          </Field>
          <Field id="owner_id" label="Owner" error={errors.owner_id ?? errors.person}>
            <select id="owner_id" value={f.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={selectClass} disabled={loading}>
              <option value="">Pick a person</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="approver_id" label="Approver (optional)">
            <select id="approver_id" value={f.approver_id} onChange={(e) => set("approver_id", e.target.value)} className={selectClass} disabled={loading}>
              <option value="">None</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="control_id" label="What is waived" error={errors.control_id ?? errors.control}>
          <select id="control_id" value={f.control_id} onChange={(e) => set("control_id", e.target.value)} className={selectClass} disabled={loading}>
            <option value="">Pick a control</option>
            {controls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.framework ? ` (${c.framework})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field id="service_ids" label="Where it applies" error={errors.service_ids ?? errors.service}>
          <div id="service_ids" tabIndex={-1} className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border-strong p-2 sm:grid-cols-3">
            {services.map((s) => (
              <label key={s.service.id} className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={f.service_ids.includes(s.service.id)}
                  onChange={(e) => set("service_ids", e.target.checked ? [...f.service_ids, s.service.id] : f.service_ids.filter((x) => x !== s.service.id))}
                />
                {s.service.label}
              </label>
            ))}
          </div>
        </Field>
        <Field id="description" label="Why, and what mitigates it (optional)">
          <Textarea id="description" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} />
        </Field>
        <Field id="evidence" label="Evidence link or ticket (optional)" helper="For example PAY-4821 or a URL.">
          <Input id="evidence" value={f.evidence_ref} onChange={(e) => set("evidence_ref", e.target.value)} maxLength={300} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" loading={save.isPending && save.variables === false}>
            Save as draft
          </Button>
          {ROLE_RANK[role] >= ROLE_RANK.reviewer && (
            <Button type="button" loading={save.isPending && save.variables === true} onClick={() => submit(true)}>
              Save and activate
            </Button>
          )}
        </div>
      </form>
    </PageContainer>
  );
}
