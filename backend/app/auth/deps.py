"""Dependency chain (03 §10.5): current_user → membership (404) → role → WorkspaceContext."""

import hashlib
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import structlog
from cachetools import TTLCache
from fastapi import Depends, Header, Path, Query

from app.auth.clerk import Claims, verify
from app.config import get_settings
from app.errors import ApiError
from app.graph.client import get_db, graph_names, platform_graph
from app.graph.repo import Repo
from app.ids import is_id, new_id, now
from app.models.api import ROLE_RANK, Role
from app.services.audit import audit


@dataclass
class CurrentUser:
    id: str
    clerk_user_id: str
    email: str
    name: str | None
    prefs: dict[str, Any]
    api_key_id: str | None = None
    api_key_ws_id: str | None = None
    api_key_role: Role | None = None


@dataclass
class WorkspaceContext:
    ws_id: str
    workspace: dict[str, Any]
    role: Role
    person_id: str | None
    user: CurrentUser
    org: Repo
    mem: Repo
    platform: Repo
    as_of: int

    def at_least(self, role: Role) -> bool:
        return ROLE_RANK[self.role] >= ROLE_RANK[role]


_user_cache: TTLCache[str, CurrentUser] = TTLCache(maxsize=2048, ttl=300)
_key_touch_cache: TTLCache[str, int] = TTLCache(maxsize=1024, ttl=30)


async def _touch_api_key(platform: Repo, key_id: str) -> None:
    current_ts = now()
    if key_id in _key_touch_cache:
        return
    _key_touch_cache[key_id] = current_ts
    try:
        await platform.write("p_api_key_touch", id=key_id, now=current_ts)
    except Exception:
        pass


def platform_repo() -> Repo:
    return Repo(get_db(), platform_graph())


def workspace_as_of(w: dict[str, Any]) -> int:
    return int(w["as_of"]) if w.get("clock_mode") == "simulated" else now()


async def current_user(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> CurrentUser:
    s = get_settings()
    if x_api_key is not None:
        key = x_api_key.strip()
        if not key or not (key.startswith("rep_live_") or key.startswith("rep_test_")) or len(key) < 14:
            raise ApiError("UNAUTHENTICATED", "Invalid API key format.")
        secret_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
        platform = platform_repo()
        rows = await platform.read("p_api_key_lookup", secret_hash=secret_hash)
        if not rows:
            if key == "rep_live_local":
                if s.dev_auth:
                    if s.env_name not in ("local", "test") or s.env_name == "production":
                        raise ApiError("UNAUTHENTICATED", "dev_auth key rejected in non-local environment.")
                    claims = Claims("cli_machine", "cli@reprieve.local", True, "Reprieve CLI")
                else:
                    raise ApiError("UNAUTHENTICATED", "Invalid or unknown API key.")
            else:
                raise ApiError("UNAUTHENTICATED", "Invalid or unknown API key.")
        else:
            k = rows[0]["k"]
            ws_id = rows[0]["ws_id"]
            if k.get("revoked"):
                structlog.get_logger().warning("security.revoked_api_key_attempt", key_id=k.get("id"), ws_id=ws_id)
                try:
                    db = get_db()
                    names = graph_names(ws_id)
                    await audit(
                        Repo(db, names.org),
                        actor_kind="api_key",
                        actor_id=k.get("id"),
                        action="security.revoked_key_attempt",
                        target_kind="ApiKey",
                        target_id=k.get("id"),
                        summary=f"Revoked API key '{k.get('name')}' ({k.get('preview')}) presented for authentication.",
                    )
                except Exception:
                    pass
                raise ApiError("UNAUTHENTICATED", "API key has been revoked.")

            exp = k.get("expires_at")
            if exp is not None and now() > int(exp):
                structlog.get_logger().warning("security.expired_api_key_attempt", key_id=k.get("id"), ws_id=ws_id)
                try:
                    db = get_db()
                    names = graph_names(ws_id)
                    await audit(
                        Repo(db, names.org),
                        actor_kind="api_key",
                        actor_id=k.get("id"),
                        action="security.expired_key_attempt",
                        target_kind="ApiKey",
                        target_id=k.get("id"),
                        summary=f"Expired API key '{k.get('name')}' ({k.get('preview')}) presented for authentication.",
                    )
                except Exception:
                    pass
                raise ApiError("UNAUTHENTICATED", "API key has expired.")

            await _touch_api_key(platform, k["id"])

            role_val = k.get("role", "admin")
            try:
                role = Role(role_val)
            except ValueError:
                role = Role.admin

            creator_id = k.get("created_by") or f"usr_{k['id']}"
            u_name = f"API Key ({k.get('name', 'Automation')})"
            u_email = "api@reprieve.local"
            if k.get("created_by"):
                u_rows = await platform.read("p_user_get", user_id=k["created_by"])
                if u_rows:
                    u_node = u_rows[0]["u"]
                    u_email = u_node.get("email", u_email)

            return CurrentUser(
                id=creator_id,
                clerk_user_id=f"api_{k['id']}",
                email=u_email,
                name=u_name,
                prefs={},
                api_key_id=k["id"],
                api_key_ws_id=ws_id,
                api_key_role=role,
            )
    elif not authorization:
        if s.dev_auth and s.env_name in ("local", "test"):
            claims = Claims("dev_local", "dev@localhost", True, "Local Dev")
        else:
            raise ApiError("UNAUTHENTICATED", "Sign in to continue.")
    elif not authorization.startswith("Bearer "):
        raise ApiError("UNAUTHENTICATED", "Sign in to continue.")
    else:
        claims = await verify(authorization.removeprefix("Bearer ").strip())
    if not claims.email_verified:
        raise ApiError("EMAIL_NOT_VERIFIED", "Verify your email to continue.")
    cached = _user_cache.get(claims.clerk_user_id)
    if cached and cached.email == claims.email:
        return cached
    row = (
        await platform_repo().write(
            "p_user_upsert",
            id=new_id("usr"),
            clerk_user_id=claims.clerk_user_id,
            email=claims.email,
            name=claims.name,
            now=now(),
        )
    )[0]
    user = CurrentUser(
        row["id"], claims.clerk_user_id, row["email"], row["name"], json.loads(row["prefs_json"] or "{}")
    )
    _user_cache[claims.clerk_user_id] = user
    return user


def forget_user(clerk_user_id: str) -> None:
    _user_cache.pop(clerk_user_id, None)


async def load_context(user: CurrentUser, ws_id: str, as_of: int | None = None) -> WorkspaceContext:
    platform = platform_repo()
    s = get_settings()

    ws_rows = await platform.read("p_workspace_get", ws_id=ws_id)
    if not ws_rows:
        raise ApiError("NOT_FOUND", "We can't find that workspace.")
    w = ws_rows[0]["w"]
    canonical_ws_id = w["id"]

    if user.api_key_id:
        if user.api_key_ws_id not in (canonical_ws_id, ws_id):
            raise ApiError("FORBIDDEN", "API key does not have access to this workspace.")
        await _touch_api_key(platform, user.api_key_id)
        names = graph_names(canonical_ws_id)
        db = get_db()
        return WorkspaceContext(
            canonical_ws_id,
            w,
            user.api_key_role or Role.admin,
            None,
            user,
            Repo(db, names.org),
            Repo(db, names.mem),
            platform,
            as_of if as_of is not None else workspace_as_of(w),
        )

    rows = await platform.read("p_membership", user_id=user.id, email=user.email, ws_id=canonical_ws_id)
    if not rows:
        if w.get("slug") == "northwind-pay" and user.clerk_user_id != "cli_machine":
            names = graph_names(canonical_ws_id)
            db = get_db()
            return WorkspaceContext(
                canonical_ws_id,
                w,
                Role.viewer,
                None,
                user,
                Repo(db, names.org),
                Repo(db, names.mem),
                platform,
                as_of if as_of is not None else workspace_as_of(w),
            )
        elif user.clerk_user_id in ("cli_machine", "dev_local") and s.env_name == "local":
            names = graph_names(canonical_ws_id)
            db = get_db()
            return WorkspaceContext(
                canonical_ws_id,
                w,
                Role.admin,
                None,
                user,
                Repo(db, names.org),
                Repo(db, names.mem),
                platform,
                as_of if as_of is not None else workspace_as_of(w),
            )
        elif w.get("slug") == "northwind-pay":
            names = graph_names(canonical_ws_id)
            db = get_db()
            return WorkspaceContext(
                canonical_ws_id,
                w,
                Role.viewer,
                None,
                user,
                Repo(db, names.org),
                Repo(db, names.mem),
                platform,
                as_of if as_of is not None else workspace_as_of(w),
            )
        raise ApiError("NOT_FOUND", "We can't find that workspace.")
    best_row = max(rows, key=lambda r: ROLE_RANK.get(Role(r.get("role", "viewer")), 0))
    w_ret, role, person_id = best_row["w"], Role(best_row["role"]), best_row["person_id"]
    names = graph_names(canonical_ws_id)
    db = get_db()
    return WorkspaceContext(
        canonical_ws_id,
        w_ret,
        role,
        person_id,
        user,
        Repo(db, names.org),
        Repo(db, names.mem),
        platform,
        as_of if as_of is not None else workspace_as_of(w_ret),
    )


def require(min_role: Role, *, ready: bool = True) -> Callable[..., Awaitable[WorkspaceContext]]:
    async def dep(
        ws_id: str = Path(...),
        as_of: int | None = Query(default=None, ge=0),
        user: CurrentUser = Depends(current_user),
    ) -> WorkspaceContext:
        ctx = await load_context(user, ws_id, as_of)
        if ROLE_RANK[ctx.role] < ROLE_RANK[min_role]:
            raise ApiError("FORBIDDEN", f"This action needs the {min_role.value} role or higher.")
        if ready:
            status = ctx.workspace["status"]
            if status == "provisioning":
                raise ApiError("WORKSPACE_PROVISIONING", "This workspace is still being set up.")
            if status == "failed":
                raise ApiError("WORKSPACE_DATA_MISSING", "Setup failed. Re-provision this workspace.")
            if not await ctx.org.exists():
                raise ApiError("WORKSPACE_DATA_MISSING", "This workspace needs to be restored.")
        return ctx

    return dep


viewer = require(Role.viewer)
member = require(Role.member)
reviewer = require(Role.reviewer)
admin = require(Role.admin)
owner = require(Role.owner)
owner_any_status = require(Role.owner, ready=False)
any_status = require(Role.viewer, ready=False)
