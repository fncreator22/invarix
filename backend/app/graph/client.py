"""FalkorDB connection and the single graph-name builder (02 §6 rule 6)."""

import re
from dataclasses import dataclass

from falkordb.asyncio import FalkorDB

from app.config import get_settings

PLATFORM = "platform"
_WS_ID = re.compile(r"^ws_([a-z0-9]{10,32})$")

_db: FalkorDB | None = None


def get_db() -> FalkorDB:
    global _db
    if _db is None:
        s = get_settings()
        _db = FalkorDB(
            host=s.falkordb_host,
            port=s.falkordb_port,
            username=s.falkordb_username,
            password=s.falkordb_password,
            ssl=s.falkordb_tls,
        )
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.aclose()
        _db = None


@dataclass(frozen=True)
class GraphNames:
    platform: str
    org: str
    mem: str


def graph_names(ws_id: str) -> GraphNames:
    """Build graph names from a validated workspace ID. Never pass client input that skipped validation."""
    m = _WS_ID.match(ws_id)
    if not m:
        raise ValueError(f"invalid workspace id: {ws_id!r}")
    prefix = get_settings().graph_prefix
    token = m.group(1)
    return GraphNames(platform=f"{prefix}{PLATFORM}", org=f"{prefix}org_{token}", mem=f"{prefix}mem_{token}")


def platform_graph() -> str:
    return f"{get_settings().graph_prefix}{PLATFORM}"
