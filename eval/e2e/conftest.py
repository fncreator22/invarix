"""Shared test configuration, fixtures, and graph isolation for INVARIX E2E tests."""

import os
import sys
import uuid
from pathlib import Path
from typing import AsyncGenerator

import pytest
from falkordb.asyncio import FalkorDB
import httpx

# Ensure repo root and backend source are importable
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("GRAPH_PREFIX", "test_e2e_")
os.environ["DEV_AUTH"] = "false"

from app.graph.repo import Repo
from app.graph.schema import PLATFORM, ORG, MEM, ensure_schema
from app.graph.client import close_db, get_db
from app.ingest.loaders import load_bundle, read_bundle
from app.main import app


@pytest.fixture
async def e2e_db() -> AsyncGenerator[FalkorDB, None]:
    """Provide an isolated FalkorDB client per test loop."""
    host = os.getenv("FALKORDB_HOST", "localhost")
    port = int(os.getenv("FALKORDB_PORT", "6379"))
    db = FalkorDB(host=host, port=port)
    
    yield db
    
    await db.aclose()


@pytest.fixture
async def isolated_org_repo(e2e_db: FalkorDB, request) -> AsyncGenerator[Repo, None]:
    """Provide an empty, schema-initialized ORG graph repo with automated cleanup."""
    graph_id = f"test_e2e_org_{request.node.name[:30]}_{uuid.uuid4().hex[:6]}"
    repo = Repo(e2e_db, graph_id)
    await ensure_schema(repo, ORG)
    
    yield repo
    
    try:
        await repo.drop()
    except Exception:
        pass


@pytest.fixture
async def seeded_org_repo(e2e_db: FalkorDB, request) -> AsyncGenerator[Repo, None]:
    """Provide an isolated ORG graph repo loaded with the authoritative Northwind dataset."""
    graph_id = f"test_e2e_nw_{request.node.name[:30]}_{uuid.uuid4().hex[:6]}"
    repo = Repo(e2e_db, graph_id)
    await ensure_schema(repo, ORG)
    await load_bundle(repo, read_bundle(), source="sample")
    
    yield repo
    
    try:
        await repo.drop()
    except Exception:
        pass


@pytest.fixture
async def asgi_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Provide an in-memory ASGI test client for FastAPI endpoints."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
