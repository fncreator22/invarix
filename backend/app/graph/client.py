"""FalkorDB connection and graph client foundation."""

from falkordb import FalkorDB
from app.config import get_settings

_db: FalkorDB | None = None


def get_db() -> FalkorDB:
    global _db
    if _db is None:
        settings = get_settings()
        _db = FalkorDB.from_url(settings.falkordb_url)
    return _db


def close_db() -> None:
    global _db
    if _db is not None:
        _db = None
