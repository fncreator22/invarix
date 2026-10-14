"""'Why it fired' text for an alert (T-049): cached LLM summary per alert version, deterministic fallback."""

import json
from typing import Any

from app.agents import llm
from app.agents.guard import ground
from app.auth.deps import WorkspaceContext
from app.errors import ApiError

SYSTEM = (
    "Explain a risk alert to an engineering manager in 2-3 plain sentences: what combination of exceptions caused it "
    "and what to do next. Use only the JSON provided. Cite entity IDs in backticks. No preamble."
)


def deterministic(alert: dict[str, Any]) -> str:
    names = {n["id"]: n["name"] for n in alert["proof"]["nodes"]}
    steps = [
        f"{names.get(e['from'], e['from'])} → {e['type'].lower().replace('_', ' ')} → {names.get(e['to'], e['to'])}"
        for e in alert["proof"]["edges"][:6]
    ]
    text = alert.get("summary") or alert["title"]
    return text + ("\n\nPath: " + "; ".join(steps) + "." if steps else "")


async def explain(ctx: WorkspaceContext, alert: dict[str, Any], raw: dict[str, Any]) -> dict[str, Any]:
    fallback = {"text": deterministic(alert), "source": "deterministic", "citations": []}
    if ctx.workspace.get("ai_mode") == "off":
        return fallback
    if raw.get("llm_summary") and raw.get("llm_summary_version") == alert["version"]:
        return json.loads(raw["llm_summary"])
    slim = {k: alert[k] for k in ("rule_id", "severity", "title", "summary", "subject", "involved", "proof")}
    try:
        out = await llm.complete_json(
            ctx.ws_id,
            ctx.workspace["ai_mode"],
            [
                {"role": "system", "content": SYSTEM + ' Respond as JSON: {"text": "..."}'},
                {"role": "user", "content": json.dumps(slim)},
            ],
            {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]},
            "alert_summary",
        )
    except ApiError:
        return fallback
    known = {n["id"]: n["name"] for n in alert["proof"]["nodes"]} | {
        i["id"]: i.get("label") or i["id"] for i in alert["involved"]
    }
    text, citations, _ = ground(str(out.get("text", "")), known)
    if not text:
        return fallback
    result = {"text": text, "source": "ai", "citations": citations}
    await ctx.org.write("alert_summary_set", id=alert["id"], summary=json.dumps(result), version=alert["version"])
    return result
