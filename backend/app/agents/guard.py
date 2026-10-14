"""Groundedness validator (FR-STW-06, 03 §12.2): every ID in the answer must come from this turn's tool results."""

import re

from app.agents.tools import ID_RE, LABEL_OF

_SENTENCE = re.compile(r"(?<=[.!?])\s+|\n")


def ground(markdown: str, known: dict[str, str]) -> tuple[str, list[dict[str, str]], int]:
    """Drop sentences that cite unknown IDs; return (clean markdown, citations, removed count)."""
    removed = 0
    kept: list[str] = []
    for piece in re.split(r"(\n)", markdown):
        if piece == "\n":
            kept.append(piece)
            continue
        sentences = [s for s in _SENTENCE.split(piece) if s]
        good = []
        for s in sentences:
            if any(i not in known for i in ID_RE.findall(s)):
                removed += 1
            else:
                good.append(s)
        kept.append(" ".join(good))
    clean = re.sub(r"\n{3,}", "\n\n", "".join(kept)).strip()
    cited = list(dict.fromkeys(ID_RE.findall(clean)))
    citations = [{"kind": LABEL_OF[i.split("_", 1)[0]], "id": i, "label": known[i]} for i in cited]
    return clean, citations, removed
