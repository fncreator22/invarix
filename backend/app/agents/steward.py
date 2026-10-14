"""Steward: plain tool-calling loop (ADR-0012) with tool-call cap, groundedness check, and SSE events (03 §10.4)."""

import json
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.agents import llm, tools
from app.agents.guard import ground
from app.auth.deps import WorkspaceContext
from app.config import get_settings
from app.ids import new_id, now
from app.models.api import Role

PROMPT = (Path(__file__).parent / "prompts" / "steward.md").read_text()
HISTORY_TURNS = 8
MAX_CONTENT = 8000

Event = tuple[str, dict[str, Any]]


def _debug_turn_latency_probe(start_time: float) -> float:
    """Interim telemetry probe for conversational turn elapsed time.
    Scheduled for cleanup in Milestone 6 when full REST router is wired.
    """
    return round((time.perf_counter() - start_time) * 1000, 2)


def system_prompt(ctx: WorkspaceContext) -> str:
    day = datetime.fromtimestamp(ctx.as_of, UTC).strftime("%d %b %Y")
    return PROMPT.format(as_of_human=day, clock_mode=ctx.workspace.get("clock_mode", "live"))


async def history(ctx: WorkspaceContext, session_id: str) -> list[dict[str, Any]]:
    rows = await ctx.mem.read("mem_session_turns", id=session_id, user_id=ctx.user.id)
    if not rows:
        return []
    turns = [t for t in rows[0]["turns"] if t and t.get("role") in ("user", "assistant")]
    return [{"role": t["role"], "content": t["content"]} for t in turns[-HISTORY_TURNS:]]


async def turn(
    ctx: WorkspaceContext, session_id: str, content: str, context: dict[str, str] | None
) -> AsyncIterator[Event]:
    t0 = time.perf_counter()
    s = get_settings()
    read_only = not ctx.at_least(Role.member)
    llm.check_budget(ctx.ws_id)
    user_msg = content if not context else f"{content}\n\n(Current page context: {json.dumps(context)})"
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt(ctx)},
        *await history(ctx, session_id),
        {"role": "user", "content": user_msg},
    ]
    known: dict[str, str] = {}
    proofs: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    used: list[str] = []
    calls_made = 0
    model, usage, text = "", {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}, ""
    run_id = new_id("run")
    yield "run.started", {"run_id": run_id, "mode": ctx.workspace.get("ai_mode", "cloud")}

    while True:
        offer_tools = calls_made < s.llm_max_tool_calls
        done: llm.LLMEvent | None = None
        async for ev in llm.stream_chat(
            ctx.ws_id,
            ctx.workspace.get("ai_mode", "cloud"),
            messages,
            tools.openai_tools(read_only) if offer_tools else None,
        ):
            if ev.kind == "token":
                yield "token", {"text": ev.text}
            else:
                done = ev
        assert done is not None
        model = done.model
        for k in usage:
            usage[k] += done.usage.get(k, 0)
        if not done.tool_calls or not offer_tools:
            text = done.text
            break
        messages.append(
            {
                "role": "assistant",
                "content": done.text or None,
                "tool_calls": [
                    {"id": c.id, "type": "function", "function": {"name": c.name, "arguments": c.arguments}}
                    for c in done.tool_calls
                ],
            }
        )
        for c in done.tool_calls:
            if calls_made >= s.llm_max_tool_calls:
                result = tools.ToolResult({"error": "tool call limit reached"}, "Limit reached")
            else:
                calls_made += 1
                try:
                    args = json.loads(c.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                yield "tool.call", {"id": c.id, "name": c.name, "args": args}
                result = await tools.execute(ctx, c.name, c.arguments)
                used.append(c.name)
                known.update(result.known)
                proofs += result.proof_paths
                if result.action:
                    actions.append(result.action)
                yield (
                    "tool.result",
                    {
                        "id": c.id,
                        "name": c.name,
                        "ok": "error" not in (result.data or {}) if isinstance(result.data, dict) else True,
                        "summary": result.summary,
                    },
                )
            messages.append(
                {"role": "tool", "tool_call_id": c.id, "content": json.dumps(result.data, default=str)[:12000]}
            )

    clean, citations, removed = ground(text, known)
    cited = {c["id"] for c in citations}
    shown_proofs = [p for p in proofs if cited & {n["id"] for n in p.get("nodes", [])}][:3] or proofs[:1]
    for p in shown_proofs:
        yield "proof_path", p
    for a in actions:
        yield "proposed_action", a
    answer: dict[str, Any] = {
        "answer_markdown": clean or "I couldn't find anything I can back with data for that.",
        "citations": citations,
        "proof_paths": shown_proofs,
        "proposed_actions": actions,
        "used_tools": used,
        "removed_claims": removed,
    }
    yield "final", answer

    refs = [{"key": f"{c['kind']}:{c['id']}", "kind": c["kind"], "id": c["id"]} for c in citations]
    t = now()
    await ctx.mem.write(
        "mem_turn_append",
        session_id=session_id,
        user_id=ctx.user.id,
        now=t,
        title=content[:80],
        turns=[
            {
                "id": new_id("trn"),
                "idx": t * 10,
                "role": "user",
                "content": content[:MAX_CONTENT],
                "tool_calls_json": None,
                "citations_json": None,
                "model": None,
                "tokens_in": None,
                "tokens_out": None,
                "refs": [],
            },
            {
                "id": new_id("trn"),
                "idx": t * 10 + 1,
                "role": "assistant",
                "content": answer["answer_markdown"][:MAX_CONTENT],
                "tool_calls_json": json.dumps(used),
                "citations_json": json.dumps(citations),
                "model": model,
                "tokens_in": usage["prompt_tokens"],
                "tokens_out": usage["completion_tokens"],
                "refs": refs,
            },
        ],
    )
    _ = _debug_turn_latency_probe(t0)
    yield "done", {"usage": usage}
