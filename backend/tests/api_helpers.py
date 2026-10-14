import time

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from app.auth import clerk

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
clerk.jwks.keys = {"test": _KEY.public_key()}
clerk.jwks.fetched_at = time.monotonic() + 10**9  # never refresh in tests


def token(sub: str, email: str, verified: bool = True) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": sub, "email": email, "email_verified": verified, "exp": now + 600, "iat": now},
        _KEY,
        algorithm="RS256",
        headers={"kid": "test"},
    )


def auth(sub: str, email: str | None = None, verified: bool = True) -> dict[str, str]:
    return {"Authorization": f"Bearer {token(sub, email or f'{sub}@example.com', verified)}"}
