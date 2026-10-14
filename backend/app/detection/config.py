import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.graph.repo import Repo

RULE_IDS = ("R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8")


@lru_cache
def defaults() -> dict[str, Any]:
    return yaml.safe_load((Path(__file__).parent / "config.yaml").read_text())


@dataclass
class DetectionConfig:
    params: dict[str, dict[str, Any]]
    enabled: set[str]
    scoring: dict[str, Any] = field(default_factory=lambda: defaults()["scoring"])


def preset(name: str = "balanced") -> DetectionConfig:
    return DetectionConfig(params={k: dict(v) for k, v in defaults()["presets"][name].items()}, enabled=set(RULE_IDS))


def default_rule_rows(name: str = "balanced") -> list[dict[str, Any]]:
    rows = [
        {"rule_id": r, "enabled": True, "params_json": json.dumps(p)} for r, p in defaults()["presets"][name].items()
    ]
    rows.append({"rule_id": "SCORING", "enabled": True, "params_json": json.dumps(defaults()["scoring"])})
    return rows


async def load_config(repo: Repo) -> DetectionConfig:
    cfg = preset()
    for row in await repo.read("rule_configs"):
        params = json.loads(row["params_json"] or "{}")
        if row["rule_id"] == "SCORING":
            cfg.scoring = {**cfg.scoring, **params}
            continue
        cfg.params[row["rule_id"]] = {**cfg.params.get(row["rule_id"], {}), **params}
        if not row["enabled"]:
            cfg.enabled.discard(row["rule_id"])
    return cfg
