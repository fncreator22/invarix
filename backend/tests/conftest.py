import os

import pytest
from falkordb.asyncio import FalkorDB

from app.graph.repo import Repo

os.environ.setdefault("GRAPH_PREFIX", "test_")
os.environ["DEV_AUTH"] = "false"


@pytest.fixture
async def db():
    from app.auth import deps
    from app.graph import client as graph_client

    deps._user_cache.clear()  # graphs are wiped per test; cached user ids would dangle
    await graph_client.close_db()
    d = FalkorDB(host=os.getenv("FALKORDB_HOST", "localhost"), port=int(os.getenv("FALKORDB_PORT", "6379")))
    yield d
    await graph_client.close_db()
    for name in await d.list_graphs():
        if name.startswith("test_"):
            try:
                await d.select_graph(name).delete()
            except Exception:
                pass
    await d.aclose()


@pytest.fixture
async def repo(db, request):
    return Repo(db, f"test_{request.node.name[:40]}")
