"""One OpenAI-compatible adapter (ADR-0006): OpenAI, Ollama, or any compatible host. Primary → one fallback hop."""

import hashlib
import json
import time
from collections import defaultdict
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import openai
from cachetools import TTLCache

from app.config import get_settings
from app.errors import ApiError
from app.ids import DAY


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class LLMEvent:
    """Streaming event: kind = token | done."""

    kind: str
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    usage: dict[str, int] = field(default_factory=dict)
    model: str = ""


@dataclass
class Provider:
    name: str
    client: openai.AsyncOpenAI
    model: str


def _provider(kind: str) -> Provider | None:
    s = get_settings()
    if kind == "openai" and s.openai_api_key and s.openai_model_agent:
        return Provider(
            "openai", openai.AsyncOpenAI(api_key=s.openai_api_key, timeout=s.llm_timeout_s), s.openai_model_agent
        )
    if kind == "local" and s.local_llm_model:
        return Provider(
            "local",
            openai.AsyncOpenAI(base_url=s.local_llm_base_url, api_key=s.local_llm_api_key, timeout=s.llm_timeout_s),
            s.local_llm_model,
        )
    if kind == "compat" and s.compat_base_url and s.compat_model:
        return Provider(
            "compat",
            openai.AsyncOpenAI(
                base_url=s.compat_base_url,
                api_key=s.compat_api_key,
                timeout=s.llm_timeout_s,
                default_headers={
                    "HTTP-Referer": s.web_origin,
                    "X-Title": "Reprieve",
                },
            ),
            s.compat_model,
        )
    return None


def providers(ai_mode: str) -> list[Provider]:
    """cloud: primary then fallback; private: only local/compat (nothing leaves to OpenAI); off: none."""
    s = get_settings()
    if ai_mode == "off":
        return []
    order = [s.llm_primary, s.llm_fallback] if ai_mode == "cloud" else ["local", "compat"]
    out = [p for p in (_provider(k) for k in order if k != "none") if p]
    return out[:2]


# --- budget (per workspace per day) and identical-request cache, in-process (single instance, 03 §14) ---
_used: dict[tuple[str, int], int] = defaultdict(int)
_cache: TTLCache[str, LLMEvent] = TTLCache(maxsize=512, ttl=get_settings().llm_cache_ttl_s)


def check_budget(ws_id: str) -> None:
    if _used[(ws_id, int(time.time()) // DAY)] >= get_settings().llm_daily_token_budget_per_ws:
        raise ApiError("QUOTA_EXCEEDED", "Today's AI budget for this workspace is used up. Quick answers still work.")


def _charge(ws_id: str, usage: dict[str, int]) -> None:
    _used[(ws_id, int(time.time()) // DAY)] += usage.get("total_tokens", 0)


async def stream_chat(
    ws_id: str, ai_mode: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None
) -> AsyncIterator[LLMEvent]:
    """Yields token events, then one done event with tool calls and usage. Falls back once on transport errors."""
    plist = providers(ai_mode)
    if not plist:
        raise ApiError("AI_DISABLED" if ai_mode == "off" else "LLM_UNAVAILABLE", "No AI provider is configured.")
    key = hashlib.sha256(
        json.dumps([plist[0].model, messages, tools], sort_keys=True, default=str).encode()
    ).hexdigest()
    if key in _cache:
        hit = _cache[key]
        if hit.text:
            yield LLMEvent("token", text=hit.text)
        yield hit
        return
    last: Exception | None = None
    for p in plist:
        emitted = False
        try:
            kwargs: dict[str, Any] = {
                "model": p.model,
                "messages": messages,
                "stream": True,
                "stream_options": {"include_usage": True},
            }
            if tools:
                kwargs["tools"] = tools
            stream = await p.client.chat.completions.create(**kwargs)
            text: list[str] = []
            calls: dict[int, dict[str, str]] = {}
            usage: dict[str, int] = {}
            async for chunk in stream:
                if chunk.usage:
                    usage = {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                        "total_tokens": chunk.usage.total_tokens,
                    }
                for choice in chunk.choices:
                    d = choice.delta
                    if d.content:
                        emitted = True
                        text.append(d.content)
                        yield LLMEvent("token", text=d.content)
                    for tc in d.tool_calls or []:
                        slot = calls.setdefault(tc.index, {"id": "", "name": "", "arguments": ""})
                        slot["id"] = tc.id or slot["id"]
                        if tc.function:
                            slot["name"] += tc.function.name or ""
                            slot["arguments"] += tc.function.arguments or ""
            done = LLMEvent(
                "done",
                text="".join(text),
                usage=usage,
                model=p.model,
                tool_calls=[
                    ToolCall(c["id"] or f"call_{i}", c["name"], c["arguments"] or "{}")
                    for i, c in sorted(calls.items())
                ],
            )
            _charge(ws_id, usage)
            _cache[key] = done
            yield done
            return
        except (
            openai.APIConnectionError,
            openai.APITimeoutError,
            openai.RateLimitError,
            openai.InternalServerError,
        ) as ex:
            last = ex
            if emitted:
                break
    raise ApiError("LLM_UNAVAILABLE", "The AI provider is unavailable. Quick answers still work.") from last


async def complete_json(
    ws_id: str, ai_mode: str, messages: list[dict[str, Any]], schema: dict[str, Any], name: str
) -> dict[str, Any]:
    """Non-streaming structured output: JSON-schema response format, falling back to JSON mode, one retry."""
    plist = providers(ai_mode)
    if not plist:
        raise ApiError("AI_DISABLED" if ai_mode == "off" else "LLM_UNAVAILABLE", "No AI provider is configured.")
    check_budget(ws_id)
    last: Exception | None = None
    for p in plist:
        for fmt in ({"type": "json_schema", "json_schema": {"name": name, "schema": schema}}, {"type": "json_object"}):
            try:
                r = await p.client.chat.completions.create(model=p.model, messages=messages, response_format=fmt)  # type: ignore[call-overload]
                if r.usage:
                    _charge(ws_id, {"total_tokens": r.usage.total_tokens})
                return dict(json.loads(r.choices[0].message.content or "{}"))
            except (json.JSONDecodeError, openai.BadRequestError) as ex:
                last = ex
            except (
                openai.APIConnectionError,
                openai.APITimeoutError,
                openai.RateLimitError,
                openai.InternalServerError,
            ) as ex:
                last = ex
                break
    raise ApiError("LLM_UNAVAILABLE", "The AI provider is unavailable.") from last
