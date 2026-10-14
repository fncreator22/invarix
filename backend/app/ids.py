import re
import time

from ulid import ULID

DAY = 86400
ID_RE = re.compile(r"^[a-z]+_[a-z0-9_-]{1,36}$")


def new_id(prefix: str) -> str:
    return f"{prefix}_{str(ULID()).lower()}"


def now() -> int:
    return int(time.time())


def is_id(value: str, prefix: str | None = None) -> bool:
    return bool(ID_RE.match(value)) and (prefix is None or value.startswith(prefix + "_"))
