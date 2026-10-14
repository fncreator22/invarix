"""Proof paths (03 §8.3): built from IDs returned by rule queries, then hydrated with names."""

from dataclasses import dataclass, field
from typing import Any

from app.graph.repo import Repo


@dataclass
class Proof:
    summary: str
    edges: list[tuple[str, str, str]] = field(default_factory=list)  # (from, to, type)
    extra_nodes: list[str] = field(default_factory=list)

    def add(self, a: str, rel: str, b: str) -> "Proof":
        if (a, b, rel) not in self.edges:
            self.edges.append((a, b, rel))
        return self

    def node_ids(self) -> list[str]:
        seen: dict[str, None] = {}
        for a, b, _ in self.edges:
            seen.setdefault(a)
            seen.setdefault(b)
        for n in self.extra_nodes:
            seen.setdefault(n)
        return list(seen)


def dependency_path(proof: Proof, path_ids: list[str], *, head_rel: str | None = None) -> Proof:
    """path_ids = [head?, service, …, landing, exception]: DEPENDS_ON hops, then exception -AFFECTS-> landing."""
    nodes = path_ids
    start = 0
    if head_rel:
        proof.add(nodes[0], head_rel, nodes[1])
        start = 1
    for a, b in zip(nodes[start:-2], nodes[start + 1 : -1], strict=True):
        proof.add(a, "DEPENDS_ON", b)
    return proof.add(nodes[-1], "AFFECTS", nodes[-2])


async def hydrate(repo: Repo, proofs: list[Proof]) -> list[dict[str, Any]]:
    ids = sorted({n for p in proofs for n in p.node_ids()})
    info = {r["id"]: r for r in await repo.read("hydrate_nodes", ids=ids)} if ids else {}
    out = []
    for p in proofs:
        nodes = [
            {"id": n, "label": info.get(n, {}).get("label", "Unknown"), "name": info.get(n, {}).get("name", n)}
            for n in p.node_ids()
        ]
        out.append(
            {"summary": p.summary, "nodes": nodes, "edges": [{"from": a, "to": b, "type": t} for a, b, t in p.edges]}
        )
    return out
