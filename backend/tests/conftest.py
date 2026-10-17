import os

import pytest
from falkordb.asyncio import FalkorDB

from app.graph.repo import Repo

os.environ.setdefault("GRAPH_PREFIX", "test_")
os.environ["DEV_AUTH"] = "false"


def _is_falkordb_reachable(host: str, port: int) -> bool:
    import socket
    try:
        with socket.create_connection((host, port), timeout=0.8):
            return True
    except (OSError, TimeoutError):
        return False


@pytest.fixture
async def db():
    from app.auth import deps
    from app.graph import client as graph_client

    host = os.getenv("FALKORDB_HOST", "localhost")
    port = int(os.getenv("FALKORDB_PORT", "6379"))

    if not _is_falkordb_reachable(host, port):
        pytest.skip(f"FalkorDB is offline at {host}:{port} (run docker compose up -d or start FalkorDB to run live graph integration tests).")

    deps._user_cache.clear()  # graphs are wiped per test; cached user ids would dangle
    await graph_client.close_db()
    d = FalkorDB(host=host, port=port)
    yield d
    await graph_client.close_db()
    try:
        for name in await d.list_graphs():
            if name.startswith("test_"):
                try:
                    await d.select_graph(name).delete()
                except Exception:
                    pass
    except Exception:
        pass
    await d.aclose()


@pytest.fixture
async def repo(db, request):
    return Repo(db, f"test_{request.node.name[:40]}")
