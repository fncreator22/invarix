import time

from app.graph.schema import ORG, ensure_schema
from app.ingest.loaders import load_bundle, read_bundle


async def counts(repo):
    return {r["label"]: r["n"] for r in await repo.read("count_labels")}


async def test_sample_bundle_loads_idempotently_and_fast(repo):
    await ensure_schema(repo, ORG)
    bundle = read_bundle()
    t = time.monotonic()
    await load_bundle(repo, bundle, source="sample")
    assert time.monotonic() - t < 30
    first = await counts(repo)
    assert first["Team"] == 8 and first["Person"] == 40 and first["Service"] == 25 and first["Exception"] == 60
    await load_bundle(repo, bundle, source="sample")
    assert await counts(repo) == first
    edges = await repo.g.query("MATCH ()-[r]->() RETURN type(r), count(r)")
    by_type = dict(edges.result_set)
    assert by_type["WAIVES"] == 60 and by_type["OWNED_BY"] == 60 and by_type["RENEWS"] == 3
    assert by_type["COMPENSATED_BY"] >= 25 and by_type["RELIES_ON"] >= 3
