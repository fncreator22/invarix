"""Drop every graph with the configured GRAPH_PREFIX (default dev_). Local/dev use only."""

import asyncio
import os

from falkordb.asyncio import FalkorDB


async def main() -> None:
    prefix = os.getenv("GRAPH_PREFIX", "dev_")
    if prefix.startswith("prod"):
        raise SystemExit("refusing to reset production graphs")
    db = FalkorDB(host=os.getenv("FALKORDB_HOST", "localhost"), port=int(os.getenv("FALKORDB_PORT", "6379")))
    for g in await db.list_graphs():
        if g.startswith(prefix):
            await db.select_graph(g).delete()
            print("dropped", g)
    await db.aclose()


asyncio.run(main())
