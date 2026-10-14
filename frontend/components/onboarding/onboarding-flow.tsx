"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Database, FilePlus2, Search, Sparkles, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { describedBy, Field } from "@/components/field";
import { LogoMark } from "@/components/logo";
import { RuleChip, isRuleId } from "@/components/rule-chip";
import { ScoreRing } from "@/components/score-ring";
import { ColdStartCard } from "@/components/system/overlays";
import { PROVISION_STEPS, ProvisioningStepper } from "@/components/system/provisioning-view";
import { ServerErrorView } from "@/components/system/status-views";
import { isApiError, newRequestId, useApi, wsPath } from "@/lib/api";
import { useAuthBridge } from "@/lib/auth";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { UserButton } from "@clerk/nextjs";
import { errorMessage, requestIdOf } from "@/lib/errors";
import { slugify } from "@/lib/format";
import { openStream } from "@/lib/sse";
import { SLUG_PATTERN, type PersonRow, type ServiceRisk, type WorkspaceOut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { lastWorkspace, meQueryKey, useMe } from "@/lib/workspace";

type Path = "sample" | "blank";
type Step =
  | { n: 1 }
  | { n: 2 }
  | { n: 3; ws: WorkspaceOut }
  | { n: 4; ws: WorkspaceOut }
  | { n: 5; ws: WorkspaceOut };

const TOTAL = 5;

function Card({ step, title, description, children, footer }: { step: number; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section aria-labelledby="onb-title" className="card-e1 w-full overflow-hidden shadow-e2">
      <div className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3">
          <p className="text-caption font-medium text-text-muted">
            Step {step} of {TOTAL}
          </p>
          <div className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: TOTAL }, (_, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-aurora" : "bg-border-subtle")} />
            ))}
          </div>
        </div>
        <h1 id="onb-title" className="mt-6 text-h2 font-semibold">
          {title}
        </h1>
        {description && <p className="mt-2 text-body text-text-secondary">{description}</p>}
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
      {footer && (
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-border-subtle bg-surface px-6 py-4 sm:px-8">{footer}</div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ step 1
function PathStep({ value, onChange, onNext }: { value: Path; onChange: (p: Path) => void; onNext: () => void }) {
  const options = [
    {
      value: "blank" as const,
      icon: FilePlus2,
      title: "Start blank (Clean Slate)",
      body: "An empty workspace for your company. Connect your repositories via CLI (reprieve scan), configure MCP tools, or generate API keys to ingest live data.",
      badge: "Recommended",
    },
    {
      value: "sample" as const,
      icon: Database,
      title: "Explore with sample data",
      body: "Northwind Pay, a realistic payments company with 12 services, 31 exceptions, and 8 risk alerts. Ready in ~15 seconds.",
      badge: "Demo Data",
    },
  ];
  return (
    <Card
      step={1}
      title="How would you like to start?"
      description="Start blank to connect your own codebase, or explore with realistic sample data."
      footer={
        <Button className="ml-auto" onClick={onNext}>
          Continue
          <ArrowRight aria-hidden />
        </Button>
      }
    >
      <RadioGroup value={value} onValueChange={(v) => onChange(v as Path)} aria-label="Starting point" className="gap-3">
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors",
                value === o.value ? "border-brand bg-brand-soft" : "border-border-subtle hover:border-border-strong",
              )}
            >
              <RadioGroupItem value={o.value} className="mt-1" />
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={1.5} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-medium text-text-primary">
                  {o.title}
                  {o.badge && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-caption font-medium",
                        o.value === "blank"
                          ? "bg-brand-solid text-text-on-brand"
                          : "border border-border-subtle bg-surface-subtle text-text-secondary",
                      )}
                    >
                      {o.badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-body-sm text-text-secondary">{o.body}</span>
              </span>
            </label>
          );
        })}
        <div aria-disabled="true" className="flex items-start gap-4 rounded-lg border border-dashed border-border-subtle p-4 opacity-75 bg-bg-surface/40">
          <span className="mt-1 size-[18px] shrink-0 rounded-full border border-border-strong opacity-40" aria-hidden />
          <Upload aria-hidden className="mt-0.5 size-5 shrink-0 text-text-muted" strokeWidth={1.5} />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 font-medium text-text-secondary">
              Import my data (Direct Upload)
              <span className="inline-flex items-center rounded-full bg-brand-soft border border-brand/30 px-2.5 py-0.5 text-[11px] font-semibold text-brand tracking-wide uppercase">
                Upcoming · In Development
              </span>
            </span>
            <span className="mt-1 block text-body-sm text-text-muted">
              Direct CSV or JSON bulk upload with column mapping and schema validation. Currently under active development.
            </span>
          </span>
        </div>
      </RadioGroup>
    </Card>
  );
}

// ------------------------------------------------------------------ step 2
const nameSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(80, "Use 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "3 to 40 lowercase letters, numbers or hyphens; start and end with a letter or number."),
});
type NameForm = z.infer<typeof nameSchema>;

function NameStep({ path, onBack, onCreated }: { path: Path; onBack: () => void; onCreated: (ws: WorkspaceOut) => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);
  const idempotencyKey = useRef(newRequestId());
  const form = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    mode: "onTouched",
    defaultValues: { name: path === "sample" ? "Northwind Pay" : "", slug: path === "sample" ? "northwind-pay" : "" },
  });
  const { register, handleSubmit, setValue, setError, formState, control } = form;
  const slugValue = useWatch({ control, name: "slug" });
  const create = useMutation({
    mutationFn: (v: NameForm) =>
      api<WorkspaceOut>("/workspaces", {
        method: "POST",
        body: { name: v.name, slug: v.slug, data_mode: path },
        idempotencyKey: idempotencyKey.current,
      }),
    meta: { silent: true },
    onSuccess: (ws) => {
      void qc.invalidateQueries({ queryKey: meQueryKey });
      onCreated(ws);
    },
    onError: (e) => {
      if (isApiError(e)) {
        const fields = e.fieldErrors;
        if (fields.slug || e.status === 409) {
          setError("slug", { message: fields.slug ?? "That address is taken. Try another." }, { shouldFocus: true });
          idempotencyKey.current = newRequestId();
          return;
        }
        if (fields.name) return setError("name", { message: fields.name }, { shouldFocus: true });
      }
    },
  });
  const nameField = register("name", {
    onChange: (e) => {
      if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: formState.isSubmitted });
    },
  });
  const slugField = register("slug", {
    onChange: (e) => {
      setSlugTouched(true);
      setValue("slug", e.target.value.toLowerCase(), { shouldValidate: true });
    },
  });
  const { errors } = formState;

  return (
    <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="w-full">
      <Card
        step={2}
        title="Name your workspace"
        description="The address is permanent once the workspace is created."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onBack}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
            <Button type="submit" className="ml-auto" loading={create.isPending}>
              Create workspace
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="ws-name" label="Workspace name" error={errors.name?.message} helper="Usually your company or team.">
            <Input
              id="ws-name"
              autoComplete="organization"
              autoFocus
              placeholder={path === "sample" ? "Northwind Pay" : "e.g. Acme Corp"}
              aria-invalid={!!errors.name}
              aria-describedby={describedBy("ws-name", errors.name?.message)}
              {...nameField}
            />
          </Field>
          <Field
            id="ws-slug"
            label="Address"
            error={errors.slug?.message}
            helper={<span className="font-mono">reprieve.app/w/{slugValue || (path === "sample" ? "northwind-pay" : "your-team")}</span>}
          >
            <Input
              id="ws-slug"
              autoComplete="off"
              spellCheck={false}
              placeholder={path === "sample" ? "northwind-pay" : "acme-corp"}
              className="font-mono"
              aria-invalid={!!errors.slug}
              aria-describedby={describedBy("ws-slug", errors.slug?.message)}
              {...slugField}
            />
          </Field>
          {create.isError && !isApiError(create.error) ? (
            <p role="alert" className="text-body-sm text-danger">
              {errorMessage(create.error)}
            </p>
          ) : (
            create.isError &&
            !errors.slug &&
            !errors.name && (
              <p role="alert" className="text-body-sm text-danger">
                {errorMessage(create.error)}
              </p>
            )
          )}
        </div>
      </Card>
    </form>
  );
}

// ------------------------------------------------------------------ step 3
const STEP_KEYS = ["graph", "sample", "sentinel", "rank"];

function ProvisionStep({
  initial,
  onReady,
  onStartBlank,
}: {
  initial: WorkspaceOut;
  onReady: (ws: WorkspaceOut) => void;
  onStartBlank: () => void;
}) {
  const api = useApi();
  const { getToken } = useAuthBridge();
  const qc = useQueryClient();
  const sample = initial.data_mode === "sample";
  const [eventStep, setEventStep] = useState<number | null>(null);
  const [elapsedStep, setElapsedStep] = useState(0);

  const ws = useQuery({
    queryKey: ["workspace-provisioning", initial.id],
    queryFn: ({ signal }) => api<WorkspaceOut>(wsPath(initial.id), { signal }),
    initialData: initial,
    refetchInterval: (q) => (q.state.data?.status === "provisioning" ? 1500 : false),
  });
  const status = ws.data?.status;

  // Step labels come from `workspace.provisioning` events when available, else a gentle time estimate.
  useEffect(() => {
    if (status !== "provisioning") return;
    const ctrl = new AbortController();
    openStream({
      path: wsPath(initial.id, "/events"),
      getToken,
      signal: ctrl.signal,
      onEvent: ({ event, data }) => {
        if (event !== "workspace.provisioning") return;
        const step = (data as { step?: string | number })?.step;
        const idx = typeof step === "number" ? step : STEP_KEYS.findIndex((k) => String(step).includes(k));
        if (idx >= 0) setEventStep(idx);
      },
    }).catch(() => {});
    const t = setInterval(() => setElapsedStep((s) => Math.min(s + 1, PROVISION_STEPS.length - 1)), 6000);
    return () => {
      ctrl.abort();
      clearInterval(t);
    };
  }, [getToken, initial.id, status]);

  const handedOff = useRef(false);
  useEffect(() => {
    if (status === "ready" && ws.data && !handedOff.current) {
      handedOff.current = true;
      void qc.invalidateQueries({ queryKey: meQueryKey });
      onReady(ws.data);
    }
  }, [onReady, qc, status, ws.data]);

  const retry = useMutation({
    mutationFn: () => api<unknown>(wsPath(initial.id, "/sample-data"), { method: "POST" }),
    onSuccess: () => {
      setEventStep(null);
      setElapsedStep(0);
      void ws.refetch();
    },
  });

  const failed = status === "failed";
  const active = status === "ready" ? PROVISION_STEPS.length : Math.max(eventStep ?? 0, elapsedStep);
  return (
    <Card
      step={3}
      title={failed ? "Setup didn't finish" : sample ? "Loading Northwind Pay" : "Creating your workspace"}
      description={
        failed
          ? "Nothing was lost. Try again, or start with a blank workspace instead."
          : "This usually takes under 30 seconds. You can keep this tab open."
      }
      footer={
        failed && (
          <>
            <Button variant="ghost" onClick={onStartBlank}>
              Start blank instead
            </Button>
            <Button className="ml-auto" onClick={() => retry.mutate()} loading={retry.isPending}>
              Retry
            </Button>
          </>
        )
      }
    >
      <div aria-live="polite">
        {sample ? (
          <ProvisioningStepper active={Math.min(active, PROVISION_STEPS.length)} failed={failed} />
        ) : (
          <p className="text-body text-text-secondary">{failed ? "We couldn't create the graph." : "Creating graph…"}</p>
        )}
      </div>
      {ws.isError && (
        <p className="mt-4 text-body-sm text-text-muted">Checking progress is taking longer than usual. Retrying automatically.</p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ step 4
function IdentityStep({ ws, onDone }: { ws: WorkspaceOut; onDone: () => void }) {
  const api = useApi();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>("");
  const people = useQuery({
    queryKey: ["people", ws.id, "onboarding", q],
    queryFn: async ({ signal }) => {
      return api<PersonRow[]>(wsPath(ws.id, "/people"), { signal, query: { q } });
    },
    placeholderData: (prev) => prev,
  });
  const link = useMutation({
    mutationFn: () => api<void>(wsPath(ws.id, "/link-person"), { method: "POST", body: { person_id: selected } }),
    onSuccess: onDone,
  });
  const list = (people.data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  // Auto-advance if people query resolved with 0 people so user is never stuck
  useEffect(() => {
    if (people.isSuccess && (people.data ?? []).length === 0 && !q) {
      onDone();
    }
  }, [people.isSuccess, people.data, q, onDone]);

  return (
    <Card
      step={4}
      title="Which one is you?"
      description="Linking your person record makes “Reviews assigned to me” work. You can do this later from Reviews."
      footer={
        <>
          <Button variant="ghost" onClick={onDone}>
            Skip for now
          </Button>
          <Button className="ml-auto" disabled={!selected} loading={link.isPending} onClick={() => link.mutate()}>
            This is me
          </Button>
        </>
      }
    >
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people"
          aria-label="Search people"
          className="pl-9"
        />
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-border-subtle">
        {people.isPending ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : people.isError ? (
          <div className="p-4 text-body-sm">
            <p className="text-text-secondary">{errorMessage(people.error)}</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => people.refetch()}>
              Try again
            </Button>
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={UserRound} title={q ? "No one matches that search" : "No people yet"} description={q ? "Try another name." : "You can link yourself later."} className="py-8" />
        ) : (
          <RadioGroup value={selected} onValueChange={setSelected} aria-label="People" className="gap-0">
            {list.map((p) => {
              const title = p.title ?? p.role;
              const left = p.status === "left";
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 border-b border-border-subtle px-3 py-2 last:border-0",
                    selected === p.id ? "bg-brand-soft" : "hover:bg-brand-soft/50",
                  )}
                >
                  <RadioGroupItem value={p.id} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    {title && <span className="block truncate text-body-sm text-text-muted">{title}</span>}
                  </span>
                  {left && <span className="rounded-full bg-neutral-soft px-2 text-caption text-text-secondary">Left</span>}
                </label>
              );
            })}
          </RadioGroup>
        )}
      </div>
      {link.isError && (
        <p role="alert" className="mt-3 text-body-sm text-danger">
          {errorMessage(link.error)}
        </p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ step 5
function HandoffStep({ ws }: { ws: WorkspaceOut }) {
  const api = useApi();
  const router = useRouter();
  const top = useQuery({
    queryKey: ["risk-services", ws.id, "top"],
    queryFn: async ({ signal }) => {
      const res = await api<ServiceRisk[]>(wsPath(ws.id, "/risk/services"), { signal, query: { limit: 1 } });
      return res[0] ?? null;
    },
  });
  const finish = useMutation({
    mutationFn: () => api<unknown>(wsPath(ws.id, "/onboarding"), { method: "PATCH", body: { step: "done" } }),
    meta: { silent: true },
  });
  const href = `/w/${ws.slug}/home${top.data ? `?service=${encodeURIComponent(top.data.service.id)}` : ""}`;
  const go = () => {
    finish.mutate();
    router.push(href);
  };

  return (
    <Card
      step={5}
      title="Your first insight is ready"
      description="Sentinel ranked every service by compound risk. Here is where it concentrates."
      footer={
        <Button className="ml-auto" onClick={go} disabled={top.isPending}>
          Open Home
          <ArrowRight aria-hidden />
        </Button>
      }
    >
      {top.isPending ? (
        <Skeleton className="h-24" />
      ) : top.data ? (
        <div className="flex items-center gap-5 rounded-lg border border-border-subtle bg-sunken p-4">
          <ScoreRing score={top.data.score} band={top.data.band} size="md" />
          <div className="min-w-0">
            <p className="eyebrow text-text-muted">Top risk service</p>
            <p className="mt-1 truncate text-h3 font-semibold">{top.data.service.label ?? top.data.service.id}</p>
            <p className="text-body-sm text-text-secondary">
              {top.data.active_exceptions} active exception{top.data.active_exceptions === 1 ? "" : "s"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {top.data.rule_hits.filter(isRuleId).map((r) => (
                <RuleChip key={r} rule={r} compact />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-body text-text-secondary">
          <Sparkles aria-hidden className="size-4 text-brand" />
          No compound risk yet. Home shows what to add first.
        </p>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ flow
/**
 * Onboarding (04 §5.3, decision F5). Steps 1–2 are client-side; the workspace is created with
 * `POST /workspaces {name, slug, data_mode}` and server state starts at `identity`.
 * Users who already have a workspace skip straight to it unless `?new=1`.
 */
export function OnboardingFlow() {
  const api = useApi();
  const router = useRouter();
  const params = useSearchParams();
  const wantsNew = params.get("new") === "1";
  const me = useMe();
  const [path, setPath] = useState<Path>(params.get("path") === "sample" ? "sample" : "blank");
  const [step, setStep] = useState<Step | null>(wantsNew ? { n: 1 } : null);

  // Resume: decide where an existing user belongs.
  const target = useMemo(() => {
    const ms = me.data?.memberships ?? [];
    if (wantsNew || ms.length === 0) return null;
    const last = lastWorkspace();
    const matchLast = ms.find((m) => m.slug === last);
    if (matchLast) return matchLast;
    const provisioning = ms.find((m) => m.status === "provisioning");
    if (provisioning) return provisioning;
    // If only one workspace exists, use it directly
    if (ms.length === 1) return ms[0];
    // Multiple workspaces exist and none is last-visited: null target so user can pick
    return null;
  }, [me.data, wantsNew]);
  const targetWs = useQuery({
    queryKey: ["workspace", target?.workspace_id ?? "", "resume"],
    queryFn: ({ signal }) => api<WorkspaceOut>(wsPath(target!.workspace_id), { signal }),
    enabled: !!target && step === null,
  });

  useEffect(() => {
    if (step !== null || !me.data) return;
    const ms = me.data.memberships ?? [];
    if (!wantsNew && ms.length > 1 && !target) {
      router.replace("/workspaces");
      return;
    }
    if (!target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- decide the first step once /me resolves
      setStep({ n: 1 });
      return;
    }
    const ws = targetWs.data;
    if (!ws) return;
    if (ws.status === "provisioning" || ws.status === "failed") setStep({ n: 3, ws });
    else if (!ws.onboarding_done && ws.onboarding_step === "identity" && ws.data_mode === "sample") setStep({ n: 4, ws });
    else router.replace(`/w/${ws.slug}/home`);
  }, [me.data, router, step, target, targetWs.data, wantsNew]);

  if (me.isError) return <ServerErrorView requestId={requestIdOf(me.error)} message={errorMessage(me.error)} onRetry={() => me.refetch()} />;
  if (targetWs.isError && step === null)
    return <ServerErrorView requestId={requestIdOf(targetWs.error)} message={errorMessage(targetWs.error)} onRetry={() => targetWs.refetch()} />;

  return (
    <>
      <ColdStartCard />
      {!step ? (
        <div className="card-e1 w-full space-y-4 p-8" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          {(me.data?.memberships ?? []).length > 0 && (
            <div className="pt-4 text-center">
              <p className="text-body-sm text-text-secondary">Taking longer than expected?</p>
              <Link
                href={`/w/${me.data!.memberships[0].slug}/home`}
                className="text-body-sm font-medium text-brand hover:underline"
              >
                Enter {me.data!.memberships[0].name} &rarr;
              </Link>
            </div>
          )}
        </div>
      ) : step.n === 1 ? (
        <PathStep value={path} onChange={setPath} onNext={() => setStep({ n: 2 })} />
      ) : step.n === 2 ? (
        <NameStep path={path} onBack={() => setStep({ n: 1 })} onCreated={(ws) => setStep({ n: 3, ws })} />
      ) : step.n === 3 ? (
        <ProvisionStep
          initial={step.ws}
          onReady={(ws) => (ws.data_mode === "sample" ? setStep({ n: 4, ws }) : router.replace(`/w/${ws.slug}/home`))}
          onStartBlank={() => {
            setPath("blank");
            setStep({ n: 2 });
          }}
        />
      ) : step.n === 4 ? (
        <IdentityStep ws={step.ws} onDone={() => setStep({ n: 5, ws: step.ws })} />
      ) : (
        <HandoffStep ws={step.ws} />
      )}
      {(me.data?.memberships ?? []).length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-body-sm text-text-secondary">
          <span>Or open existing workspace:</span>
          {me.data!.memberships.slice(0, 3).map((m) => (
            <Link
              key={m.workspace_id}
              href={`/w/${m.slug}/home`}
              className="font-medium text-brand hover:underline"
            >
              {m.name}
            </Link>
          ))}
          {me.data!.memberships.length > 3 && (
            <Link
              href="/workspaces"
              className="font-medium text-text-primary hover:underline"
            >
              View all ({me.data!.memberships.length}) &rarr;
            </Link>
          )}
        </div>
      )}
    </>
  );
}

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuthBridge();
  return (
    <div className="relative flex min-h-dvh flex-col items-center px-4 py-10">
      <div aria-hidden className="aurora-mesh pointer-events-none absolute inset-0" />
      <header className="relative mb-8 flex w-full max-w-[560px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-[1.2rem] font-bold">Reprieve</span>
        </Link>
        {CLERK_ENABLED ? (
          <div className="flex items-center gap-2">
            <UserButton />
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        )}
      </header>
      <main id="main" className="relative flex w-full max-w-[560px] flex-1 flex-col items-center">
        {children}
      </main>
    </div>
  );
}
