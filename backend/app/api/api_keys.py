"""Workspace-scoped API Key management (FR / Security Invariant).

Allows workspace admins/owners to generate, inspect, and revoke machine API keys
for CLI, MCP, and external automation tools.

Security Invariants:
1. Raw key is generated using cryptographic random bytes and shown ONCE upon creation.
2. Only the SHA-256 hash (secret_hash) and safe prefix/preview are stored in FalkorDB.
3. Revocation is instantaneous.
4. Each API key is strictly scoped to the workspace it was created in.
"""

import hashlib
import json
import secrets
from typing import Any

from fastapi import APIRouter, Depends, Query, status

from app.auth.deps import WorkspaceContext, admin
from app.errors import ApiError
from app.ids import new_id, now
from app.models.api import ROLE_RANK, ApiKeyCreatedOut, ApiKeyIn, ApiKeyOut, Role
from app.services.audit import audit

router = APIRouter(prefix="/workspaces/{ws_id}/api-keys", tags=["api-keys"])


def serialize_api_key(k: dict[str, Any]) -> dict[str, Any]:
    curr = now()
    exp = k.get("expires_at")
    revoked = bool(k.get("revoked", False))
    if revoked:
        status_str = "revoked"
    elif exp is not None and curr > int(exp):
        status_str = "expired"
    else:
        status_str = "active"

    scopes = []
    if k.get("scopes_json"):
        try:
            scopes = json.loads(k["scopes_json"])
        except Exception:
            scopes = []
    elif isinstance(k.get("scopes"), list):
        scopes = k["scopes"]

    role_val = k.get("role", "admin")
    try:
        role = Role(role_val)
    except ValueError:
        role = Role.admin

    return {
        "id": k["id"],
        "name": k.get("name", ""),
        "prefix": k.get("prefix", "rep_live_"),
        "preview": k.get("preview") or f"{k.get('prefix', 'rep_live_')}****{k['id'][-4:]}",
        "role": role,
        "scopes": scopes,
        "created_by": k.get("created_by", ""),
        "created_at": int(k.get("created_at") or 0),
        "expires_at": int(k["expires_at"]) if exp is not None else None,
        "last_used_at": int(k["last_used_at"]) if k.get("last_used_at") is not None else None,
        "revoked": revoked,
        "revoked_at": int(k["revoked_at"]) if k.get("revoked_at") is not None else None,
        "status": status_str,
    }


@router.post("", response_model=ApiKeyCreatedOut, status_code=status.HTTP_201_CREATED)
async def create_api_key(body: ApiKeyIn, ctx: WorkspaceContext = Depends(admin)) -> dict[str, Any]:
    """Generate a new workspace-scoped API key.
    
    The raw secret is returned ONCE and never stored in the database.
    """
    if ctx.user.api_key_id:
        raise ApiError("FORBIDDEN", "API keys cannot manage other API keys. Only human administrators can manage API keys.")

    clean_name = body.name.strip()
    if not clean_name:
        raise ApiError("BAD_REQUEST", "API key name cannot be empty or whitespace.")

    if ROLE_RANK[ctx.role] < ROLE_RANK[body.role]:
        raise ApiError("FORBIDDEN", f"Cannot grant role '{body.role.value}' exceeding your own role '{ctx.role.value}'.")

    prefix_str = "rep_test" if body.test_key else "rep_live"
    random_bytes = secrets.token_urlsafe(32)
    raw_secret = f"{prefix_str}_{random_bytes}"
    secret_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()
    preview = f"{prefix_str}_****{raw_secret[-4:]}"
    key_id = new_id("key")
    created_at = now()
    expires_at = created_at + (body.expires_in_days * 86400) if body.expires_in_days else None

    rows = await ctx.platform.write(
        "p_api_key_create",
        ws_id=ctx.ws_id,
        id=key_id,
        name=clean_name,
        prefix=f"{prefix_str}_",
        preview=preview,
        secret_hash=secret_hash,
        role=body.role.value,
        scopes_json=json.dumps(["*"]),
        created_by=ctx.user.id,
        created_at=created_at,
        expires_at=expires_at,
    )

    if not rows:
        raise ApiError("NOT_FOUND", "Workspace not found.")

    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="api_key.created",
        target_kind="ApiKey",
        target_id=key_id,
        diff={"name": clean_name, "role": body.role.value, "preview": preview},
    )

    k = rows[0]["k"]
    data = serialize_api_key(k)
    data["secret"] = raw_secret
    return data


@router.get("", response_model=list[ApiKeyOut])
async def list_api_keys(ctx: WorkspaceContext = Depends(admin)) -> list[dict[str, Any]]:
    """List all API keys for this workspace."""
    rows = await ctx.platform.read("p_api_keys_list", ws_id=ctx.ws_id)
    return [serialize_api_key(r["k"]) for r in rows]


@router.get("/{key_id}", response_model=ApiKeyOut)
async def get_api_key(key_id: str, ctx: WorkspaceContext = Depends(admin)) -> dict[str, Any]:
    """Get metadata for a specific API key."""
    rows = await ctx.platform.read("p_api_key_get", id=key_id, ws_id=ctx.ws_id)
    if not rows:
        raise ApiError("NOT_FOUND", "API key not found.")
    return serialize_api_key(rows[0]["k"])


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    permanent: bool = Query(default=False),
    ctx: WorkspaceContext = Depends(admin),
) -> None:
    """Revoke or delete an API key, instantly invalidating machine access."""
    if ctx.user.api_key_id:
        raise ApiError("FORBIDDEN", "API keys cannot manage other API keys. Only human administrators can manage API keys.")

    rows = await ctx.platform.read("p_api_key_get", id=key_id, ws_id=ctx.ws_id)
    if not rows:
        raise ApiError("NOT_FOUND", "API key not found.")

    if permanent:
        await ctx.platform.write("p_api_key_delete", id=key_id, ws_id=ctx.ws_id)
    else:
        await ctx.platform.write("p_api_key_revoke", id=key_id, ws_id=ctx.ws_id, now=now())

    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="api_key.deleted" if permanent else "api_key.revoked",
        target_kind="ApiKey",
        target_id=key_id,
    )
