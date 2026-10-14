"""Clerk session JWT verification via cached JWKS (ADR-0003)."""

import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from cachetools import TTLCache

from app.config import get_settings
from app.errors import ApiError

_JWKS_TTL = 3600
CLERK_API = "https://api.clerk.com/v1"


@dataclass(frozen=True)
class Claims:
    clerk_user_id: str
    email: str
    email_verified: bool
    name: str | None


class JwksCache:
    def __init__(self) -> None:
        self.keys: dict[str, Any] = {}
        self.fetched_at = 0.0

    async def key(self, kid: str) -> Any:
        if kid not in self.keys or time.monotonic() - self.fetched_at > _JWKS_TTL:
            await self.refresh()
        if kid not in self.keys:
            raise ApiError("UNAUTHENTICATED", "Unknown signing key.")
        return self.keys[kid]

    async def refresh(self) -> None:
        s = get_settings()
        if s.clerk_jwks_url:
            url, headers = s.clerk_jwks_url, {}
        elif s.clerk_secret_key:
            url, headers = f"{CLERK_API}/jwks", {"Authorization": f"Bearer {s.clerk_secret_key}"}
        else:
            raise ApiError("UNAUTHENTICATED", "Authentication is not configured.")
        async with httpx.AsyncClient(timeout=5) as client:
            data = (await client.get(url, headers=headers)).raise_for_status().json()
        self.keys = {k["kid"]: jwt.PyJWK(k).key for k in data["keys"]}
        self.fetched_at = time.monotonic()


jwks = JwksCache()

_profiles: TTLCache[str, tuple[str, bool, str | None]] = TTLCache(maxsize=4096, ttl=300)


async def fetch_profile(user_id: str) -> tuple[str, bool, str | None]:
    if user_id in _profiles:
        return _profiles[user_id]
    secret = get_settings().clerk_secret_key
    if not secret:
        raise ApiError("UNAUTHENTICATED", "Session token has no email and CLERK_SECRET_KEY is not set.")
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(f"{CLERK_API}/users/{user_id}", headers={"Authorization": f"Bearer {secret}"})
    if r.status_code != 200:
        raise ApiError("UNAUTHENTICATED", "Could not load your account from Clerk.")
    u = r.json()
    primary = next((e for e in u.get("email_addresses", []) if e["id"] == u.get("primary_email_address_id")), None)
    if not primary:
        raise ApiError("UNAUTHENTICATED", "Your account has no email address.")
    verified = (primary.get("verification") or {}).get("status") == "verified"
    name = " ".join(x for x in (u.get("first_name"), u.get("last_name")) if x) or None
    _profiles[user_id] = (primary["email_address"], verified, name)
    return _profiles[user_id]


def _truthy(v: Any) -> bool:
    return v is True or (isinstance(v, str) and v.lower() == "true")


async def verify(token: str) -> Claims:
    try:
        kid = jwt.get_unverified_header(token).get("kid", "")
        key = await jwks.key(kid)
        s = get_settings()
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=s.clerk_issuer or None,
            options={"require": ["exp", "sub"], "verify_iss": bool(s.clerk_issuer)},
            leeway=5,
        )
    except ApiError:
        raise
    except jwt.PyJWTError as ex:
        raise ApiError("UNAUTHENTICATED", "Your session is invalid or expired.") from ex
    email = payload.get("email")
    if email:
        return Claims(payload["sub"], email, _truthy(payload.get("email_verified")), payload.get("name") or None)
    email, verified, name = await fetch_profile(payload["sub"])
    return Claims(payload["sub"], email, verified, name)
