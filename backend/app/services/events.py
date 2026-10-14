"""In-process workspace event bus feeding SSE (03 §10.4). Single instance by design (03 §14)."""

import asyncio
from collections import defaultdict
from typing import Any

_subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)


def publish(ws_id: str, event: str, data: dict[str, Any]) -> None:
    for q in list(_subscribers.get(ws_id, ())):
        if q.qsize() < 200:
            q.put_nowait({"event": event, "data": data})


def subscribe(ws_id: str) -> asyncio.Queue[dict[str, Any]]:
    q: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    _subscribers[ws_id].add(q)
    return q


def unsubscribe(ws_id: str, q: asyncio.Queue[dict[str, Any]]) -> None:
    _subscribers[ws_id].discard(q)
