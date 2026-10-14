"use client";

import { Check, Loader2, Send, Sparkles, Square, TriangleAlert, Zap } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { toast } from "sonner";
import { CitationChip } from "@/components/citation-chip";
import { ProofPath } from "@/components/proof-path";
import { ProposedActionCard } from "@/components/proposed-action-card";
import { ThinkingOrb, type OrbState } from "@/components/ui/thinking-orb";
import { Button } from "@/components/ui/button";
import { isApiError, useApi, wsPath } from "@/lib/api";
import { useAuthBridge } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { openStream } from "@/lib/sse";
import type { ProposedAction, ReviewOut, StewardAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

type Tool = { id: string; name: string; summary?: string; ok?: boolean };
type Msg = { role: "user" | "assistant"; text: string; answer?: StewardAnswer; tools: Tool[]; streaming?: boolean };

const SUGGESTED = ["Which service is carrying the most hidden risk?", "Who should own exceptions whose owner left?", "What expires next week?"];
const DEGRADED = new Set(["LLM_UNAVAILABLE", "AI_DISABLED", "QUOTA_EXCEEDED"]);

const TOOL_LABEL: Record<string, string> = {
  list_risk_services: "Reading risk ranking",
  explain_service: "Explaining a service score",
  list_alerts: "Listing alerts",
  get_alert: "Reading an alert",
  list_exceptions: "Listing exceptions",
  get_exception: "Reading an exception",
  find_current_owner: "Resolving the owner",
  proof_path: "Finding shortest proof path",
  search_entities: "Searching graph entities",
  recall_precedent: "Recalling past decisions",
  what_if_as_of: "Previewing simulation date",
  propose_review: "Drafting proposed action",
};

const TOOL_ORB_STATE: Record<string, OrbState> = {
  list_risk_services: "searching",
  explain_service: "solving",
  list_alerts: "searching",
  get_alert: "searching",
  list_exceptions: "searching",
  get_exception: "searching",
  find_current_owner: "searching",
  proof_path: "solving",
  search_entities: "searching",
  recall_precedent: "searching",
  what_if_as_of: "solving",
  propose_review: "shaping",
};

/** SCR-P-13 conversation: streaming answer, tool trace, citations, proof paths, approvals, degraded mode. */
export function StewardChat({ initialPrompt, compact = false }: { initialPrompt?: string; compact?: boolean }) {
  const api = useApi();
  const { getToken } = useAuthBridge();
  const { wsId, slug, role } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [degraded, setDegraded] = useState<string | null>(null);
  const session = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const patchLast = (fn: (m: Msg) => Msg) => setMessages((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1])]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setBusy(true);
    setMessages((ms) => [...ms, { role: "user", text: content, tools: [] }, { role: "assistant", text: "", tools: [], streaming: true }]);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      session.current ??= (await api<{ id: string }>(wsPath(wsId, "/chat/sessions"), { method: "POST" })).id;
      await openStream({
        path: wsPath(wsId, `/chat/sessions/${session.current}/messages`),
        method: "POST",
        body: { content, context: { page: pathname } },
        getToken,
        signal: ctrl.signal,
        openWhenHidden: true,
        onEvent: ({ event, data }) => {
          const d = data as Record<string, unknown>;
          if (event === "token") patchLast((m) => ({ ...m, text: m.text + String(d.text) }));
          else if (event === "tool.call") patchLast((m) => ({ ...m, tools: [...m.tools, { id: String(d.id), name: String(d.name) }] }));
          else if (event === "tool.result")
            patchLast((m) => ({ ...m, tools: m.tools.map((t) => (t.id === d.id ? { ...t, summary: String(d.summary), ok: Boolean(d.ok) } : t)) }));
          else if (event === "final") patchLast((m) => ({ ...m, answer: data as StewardAnswer }));
          else if (event === "error") {
            if (DEGRADED.has(String(d.code))) setDegraded(String(d.message));
            patchLast((m) => ({ ...m, text: String(d.message ?? "Steward hit an error.") }));
          }
        },
      });
    } catch (e) {
      if (!ctrl.signal.aborted) {
        if (isApiError(e) && DEGRADED.has(e.code)) setDegraded(e.message);
        patchLast((m) => ({ ...m, text: m.text || errorMessage(e) }));
      }
    } finally {
      patchLast((m) => ({ ...m, streaming: false }));
      setBusy(false);
    }
  }

  async function quick(kind: "top_risk" | "owner", exceptionId?: string) {
    setMessages((ms) => [...ms, { role: "user", text: kind === "owner" ? "Who owns this exception now?" : "Where is risk highest right now?", tools: [] }]);
    try {
      const answer = await api<StewardAnswer>(wsPath(wsId, "/chat/quick"), { method: "POST", body: { kind, exception_id: exceptionId } });
      setMessages((ms) => [...ms, { role: "assistant", text: answer.answer_markdown, answer, tools: [] }]);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function approve(action: ProposedAction) {
    const res = await api<{ review: ReviewOut }>(wsPath(wsId, `/chat/actions/${action.action_id}/approve`), { method: "POST" });
    toast.success("Review opened.");
    router.push(`/w/${slug}/reviews/${res.review.id}`);
  }

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once for the prompt handed over from Home
  }, [initialPrompt]);

  const excOnPage = pathname.match(/\/exceptions\/(exc_[a-z0-9_-]+)/)?.[1];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex-1 space-y-6 overflow-y-auto", compact ? "p-4" : "py-6")} aria-live="polite" aria-busy={busy}>
        {degraded && (
          <div role="status" className="flex gap-2 rounded-md border border-sev-moderate bg-sev-moderate-soft px-3 py-2 text-body-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-sev-moderate" aria-hidden />
            <span>{degraded} Quick answers below work without AI.</span>
          </div>
        )}
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-text-secondary">Ask about risk, owners, expiries or past decisions. Every fact comes with a citation.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border-subtle px-3 py-1 text-left text-body-sm text-text-secondary hover:border-brand hover:text-text-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-brand-soft px-3 py-2">
              {m.text}
            </div>
          ) : (
            <AssistantMessage key={i} msg={m} role={role} onApprove={approve} />
          ),
        )}
        <div ref={end} />
      </div>

      <div className={cn("space-y-2 border-t border-border-subtle bg-surface", compact ? "p-3" : "py-3")}>
        <div className="flex flex-wrap gap-1.5">
          <QuickChip onClick={() => quick("top_risk")}>Top risk right now</QuickChip>
          {excOnPage && <QuickChip onClick={() => quick("owner", excOnPage)}>Who owns this?</QuickChip>}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Message Steward</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask Steward…"
              className="max-h-40 min-h-10 w-full resize-none rounded-md border border-border-strong bg-sunken px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
          {busy ? (
            <Button type="button" variant="secondary" aria-label="Stop" onClick={() => abort.current?.abort()}>
              <Square aria-hidden />
            </Button>
          ) : (
            <Button type="submit" aria-label="Send" disabled={!input.trim()}>
              <Send aria-hidden />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

function AssistantMessage({ msg, role, onApprove }: { msg: Msg; role: ReturnType<typeof useWorkspace>["role"]; onApprove: (a: ProposedAction) => Promise<unknown> }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const a = msg.answer;
  const cites = Object.fromEntries((a?.citations ?? []).map((c) => [c.id, c]));
  const text = a?.answer_markdown ?? msg.text;
  return (
    <div className="flex gap-3">
      {msg.streaming ? (
        <ThinkingOrb size={20} state="composing" className="mt-1 shrink-0" aria-label="Steward is composing response" />
      ) : (
        <Sparkles className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
      )}
      <div className="min-w-0 flex-1 space-y-3">
        {msg.tools.length > 0 && (
          <details className="text-caption text-text-muted" open={msg.streaming}>
            <summary className="cursor-pointer select-none">How I got this ({msg.tools.length} steps)</summary>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {msg.tools.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-0.5" title={t.summary}>
                  {t.summary ? (
                    <Check className="size-3 text-sev-low" aria-hidden />
                  ) : (
                    <ThinkingOrb
                      size={20}
                      state={TOOL_ORB_STATE[t.name] ?? "working"}
                      aria-label={TOOL_LABEL[t.name] ?? "Working…"}
                      className="size-3.5"
                    />
                  )}
                  <span>{TOOL_LABEL[t.name] ?? t.name}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="prose-steward max-w-[70ch] space-y-2 leading-relaxed">
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            components={{
              code: ({ children }) => {
                const id = String(children);
                return cites[id] ? <CitationChip citation={cites[id]} /> : <code className="rounded bg-sunken px-1 font-mono text-[0.9em]">{children}</code>;
              },
              ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
            }}
          >
            {text}
          </ReactMarkdown>
          {msg.streaming && !msg.text && <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Thinking" />}
        </div>
        {!!a?.removed_claims && (
          <p className="flex items-center gap-1.5 text-caption text-text-muted">
            <TriangleAlert className="size-3.5" aria-hidden /> Some details were removed because they could not be verified.
          </p>
        )}
        {a?.proof_paths.map((p, i) => <ProofPath key={i} path={p} compact />)}
        {a?.proposed_actions
          .filter((x) => !dismissed.includes(x.action_id))
          .map((x) => (
            <ProposedActionCard key={x.action_id} action={x} role={role} onApprove={onApprove} onDismiss={() => setDismissed((d) => [...d, x.action_id])} />
          ))}
      </div>
    </div>
  );
}

function QuickChip({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-0.5 text-caption text-text-secondary hover:border-brand hover:text-text-primary">
      <Zap className="size-3" aria-hidden /> {children}
    </button>
  );
}
