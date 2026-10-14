"""Unit and integration tests for Organization/Workspace-scoped API Key management and auth."""

import httpx
import pytest

from app.api.system import bootstrap as system_bootstrap
from app.graph import client as graph_client
from app.ids import new_id, now
from app.main import app
from tests.api_helpers import auth

ADMIN_A = auth("admin_user", "admin@example.com")
OTHER_USER = auth("other_user", "other@example.com")


@pytest.fixture
async def api(db):
    graph_client._db = None
    await system_bootstrap()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t/api/v1") as c:
        yield c
    await graph_client.close_db()


async def test_api_key_lifecycle_and_authentication(api):
    # 1. Create a workspace
    slug = f"secops-{new_id('ws')[3:12]}"
    r_ws = await api.post(
        "/workspaces",
        headers=ADMIN_A,
        json={"name": "SecOps Org", "slug": slug, "data_mode": "sample"},
    )
    assert r_ws.status_code == 201, r_ws.text
    ws_id = r_ws.json()["id"]

    # 2. Generate an API Key (admin)
    create_payload = {
        "name": "CI/CD Deployment Gate",
        "role": "admin",
        "expires_in_days": 30,
        "test_key": False,
    }
    r_key = await api.post(f"/workspaces/{ws_id}/api-keys", headers=ADMIN_A, json=create_payload)
    assert r_key.status_code == 201, r_key.text
    key_data = r_key.json()

    assert "secret" in key_data
    raw_secret = key_data["secret"]
    assert raw_secret.startswith("rep_live_")
    key_id = key_data["id"]
    assert key_data["name"] == "CI/CD Deployment Gate"
    assert key_data["role"] == "admin"
    assert key_data["status"] == "active"
    assert key_data["preview"].startswith("rep_live_****")
    assert key_data["expires_at"] is not None

    # 3. List API Keys — verify secret_hash and raw secret are NEVER exposed
    r_list = await api.get(f"/workspaces/{ws_id}/api-keys", headers=ADMIN_A)
    assert r_list.status_code == 200
    keys = r_list.json()
    assert len(keys) == 1
    listed_key = keys[0]
    assert listed_key["id"] == key_id
    assert "secret" not in listed_key
    assert "secret_hash" not in listed_key
    assert listed_key["status"] == "active"
    assert listed_key["last_used_at"] is None

    # 4. Authenticate using the generated API Key to access a protected workspace endpoint
    r_risk = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": raw_secret})
    assert r_risk.status_code == 200, r_risk.text
    assert "active_exceptions" in r_risk.json()

    # 5. MCP tools endpoint access via X-API-Key
    r_mcp = await api.get(f"/workspaces/{ws_id}/mcp/tools", headers={"X-API-Key": raw_secret})
    assert r_mcp.status_code == 200, r_mcp.text
    assert "tools" in r_mcp.json()

    # 6. Verify last_used_at was updated
    r_list_after = await api.get(f"/workspaces/{ws_id}/api-keys", headers=ADMIN_A)
    assert r_list_after.json()[0]["last_used_at"] is not None

    # 7. Test key generation (rep_test_ prefix)
    r_test_key = await api.post(
        f"/workspaces/{ws_id}/api-keys",
        headers=ADMIN_A,
        json={"name": "Local Sandbox Tool", "role": "viewer", "test_key": True},
    )
    assert r_test_key.status_code == 201
    test_data = r_test_key.json()
    test_secret = test_data["secret"]
    assert test_secret.startswith("rep_test_")
    assert test_data["preview"].startswith("rep_test_****")
    assert test_data["role"] == "viewer"

    # Viewer key can read risk summary
    r_viewer_ok = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": test_secret})
    assert r_viewer_ok.status_code == 200

    # Viewer key is FORBIDDEN from admin endpoints like managing api-keys
    r_viewer_forbidden = await api.get(f"/workspaces/{ws_id}/api-keys", headers={"X-API-Key": test_secret})
    assert r_viewer_forbidden.status_code == 403
    assert r_viewer_forbidden.json()["code"] == "FORBIDDEN"

    # 8. Cross-workspace isolation (Tenancy Invariant)
    # Create a second workspace
    r_ws2 = await api.post(
        "/workspaces",
        headers=ADMIN_A,
        json={"name": "Other Org", "slug": "other-org", "data_mode": "blank"},
    )
    ws2_id = r_ws2.json()["id"]

    # Trying to use ws_id key against ws2_id must fail
    r_cross = await api.get(f"/workspaces/{ws2_id}/risk/summary", headers={"X-API-Key": raw_secret})
    assert r_cross.status_code == 403
    assert r_cross.json()["code"] == "FORBIDDEN"

    # 9. Revoke the API Key
    r_del = await api.delete(f"/workspaces/{ws_id}/api-keys/{key_id}", headers=ADMIN_A)
    assert r_del.status_code == 204

    # Verify key list shows status 'revoked'
    r_list_rev = await api.get(f"/workspaces/{ws_id}/api-keys", headers=ADMIN_A)
    rev_key = next(k for k in r_list_rev.json() if k["id"] == key_id)
    assert rev_key["revoked"] is True
    assert rev_key["status"] == "revoked"

    # 10. Instant invalidation: revoked key must be rejected immediately
    r_rev_use = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": raw_secret})
    assert r_rev_use.status_code == 401
    assert r_rev_use.json()["code"] == "UNAUTHENTICATED"
    assert "revoked" in r_rev_use.json()["detail"].lower()

    # 11. Rejection of completely invalid or unknown keys
    r_bogus = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": "rep_live_invalid_123456789"})
    assert r_bogus.status_code == 401
    assert r_bogus.json()["code"] == "UNAUTHENTICATED"

    r_malformed = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": "completely_invalid_prefix"})
    assert r_malformed.status_code == 401
    assert r_malformed.json()["code"] == "UNAUTHENTICATED"


async def test_api_key_expiration_enforcement(api):
    # Setup workspace
    r_ws = await api.post(
        "/workspaces",
        headers=ADMIN_A,
        json={"name": "Expiring Org", "slug": "expiring-org", "data_mode": "sample"},
    )
    ws_id = r_ws.json()["id"]

    # Create an API key
    r_key = await api.post(
        f"/workspaces/{ws_id}/api-keys",
        headers=ADMIN_A,
        json={"name": "Short-lived Key", "expires_in_days": 1},
    )
    assert r_key.status_code == 201
    secret = r_key.json()["secret"]
    key_id = r_key.json()["id"]

    # Manually backdate expires_at in DB to simulate expired key
    from app.graph.repo import Repo
    platform = Repo(graph_client.get_db(), graph_client.platform_graph())
    await platform.write(
        "p_api_key_touch",
        id=key_id,
        now=now() - 3600,
    )
    # Update expires_at specifically
    db = graph_client.get_db()
    await db.select_graph(graph_client.platform_graph()).query(
        "MATCH (k:ApiKey {id: $id}) SET k.expires_at = $past_ts RETURN k",
        {"id": key_id, "past_ts": now() - 3600},
    )

    # Calling with expired key should fail
    r_exp = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": secret})
    assert r_exp.status_code == 401
    assert r_exp.json()["code"] == "UNAUTHENTICATED"
    assert "expired" in r_exp.json()["detail"].lower()

    # List endpoint should reflect expired status
    r_list = await api.get(f"/workspaces/{ws_id}/api-keys", headers=ADMIN_A)
    expired_key = next(k for k in r_list.json() if k["id"] == key_id)
    assert expired_key["status"] == "expired"


async def test_api_key_unauthorized_access(api):
    # Workspace created by Admin A
    slug = f"prot-{new_id('ws')[3:12]}"
    r_ws = await api.post(
        "/workspaces",
        headers=ADMIN_A,
        json={"name": "Protected Org", "slug": slug, "data_mode": "blank"},
    )
    ws_id = r_ws.json()["id"]

    # Other user (not member of workspace) cannot manage API keys
    r_forbidden_create = await api.post(
        f"/workspaces/{ws_id}/api-keys",
        headers=OTHER_USER,
        json={"name": "Hacker Key"},
    )
    assert r_forbidden_create.status_code in (403, 404)

    r_forbidden_list = await api.get(f"/workspaces/{ws_id}/api-keys", headers=OTHER_USER)
    assert r_forbidden_list.status_code in (403, 404)


async def test_api_key_security_boundaries_and_protections(api):
    # Setup workspace
    r_ws = await api.post(
        "/workspaces",
        headers=ADMIN_A,
        json={"name": "Hardened Org", "slug": "hardened-org", "data_mode": "sample"},
    )
    assert r_ws.status_code == 201
    ws_id = r_ws.json()["id"]

    # 1. Rejection of empty, blank, and prefix-only keys
    for bogus_key in ["", "   ", "rep_live_", "rep_test_"]:
        r_bogus = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": bogus_key})
        assert r_bogus.status_code == 401
        assert r_bogus.json()["code"] == "UNAUTHENTICATED"

    # 2. Rejection of blank key name (Pydantic strips whitespace and rejects length 0)
    r_blank_name = await api.post(
        f"/workspaces/{ws_id}/api-keys",
        headers=ADMIN_A,
        json={"name": "   ", "role": "admin"},
    )
    assert r_blank_name.status_code == 422

    # 3. Privilege escalation prevention:
    # Admin A has 'owner' in this workspace because they created it.
    # Let's test creating a key with role admin:
    r_admin_key = await api.post(
        f"/workspaces/{ws_id}/api-keys",
        headers=ADMIN_A,
        json={"name": "Admin Automation", "role": "admin"},
    )
    assert r_admin_key.status_code == 201
    admin_key_secret = r_admin_key.json()["secret"]
    admin_key_id = r_admin_key.json()["id"]

    # 4. Machine key isolation:
    # A machine API key CANNOT create other API keys (even if it has admin role)
    r_machine_create_key = await api.post(
        f"/workspaces/{ws_id}/api-keys",
        headers={"X-API-Key": admin_key_secret},
        json={"name": "Backdoor Key", "role": "admin"},
    )
    assert r_machine_create_key.status_code == 403
    assert r_machine_create_key.json()["code"] == "FORBIDDEN"

    # A machine API key CANNOT revoke or delete API keys
    r_machine_delete_key = await api.delete(
        f"/workspaces/{ws_id}/api-keys/{admin_key_id}",
        headers={"X-API-Key": admin_key_secret},
    )
    assert r_machine_delete_key.status_code == 403
    assert r_machine_delete_key.json()["code"] == "FORBIDDEN"

    # A machine API key CANNOT create new workspaces
    r_machine_create_ws = await api.post(
        "/workspaces",
        headers={"X-API-Key": admin_key_secret},
        json={"name": "Rogue Org", "slug": "rogue-org", "data_mode": "blank"},
    )
    assert r_machine_create_ws.status_code == 403
    assert r_machine_create_ws.json()["code"] == "FORBIDDEN"

    # A machine API key CANNOT modify personal user profile
    r_machine_patch_me = await api.patch(
        "/me",
        headers={"X-API-Key": admin_key_secret},
        json={"name": "Hacked Profile"},
    )
    assert r_machine_patch_me.status_code == 403
    assert r_machine_patch_me.json()["code"] == "FORBIDDEN"

    # 5. Revocation & Leak detection audit logging:
    # Revoke the admin key
    r_revoke = await api.delete(f"/workspaces/{ws_id}/api-keys/{admin_key_id}", headers=ADMIN_A)
    assert r_revoke.status_code == 204

    # Using the revoked key now triggers 401 UNAUTHENTICATED and records audit event
    r_revoked_try = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": admin_key_secret})
    assert r_revoked_try.status_code == 401
    assert "revoked" in r_revoked_try.json()["detail"].lower()

    # 6. Permanent deletion:
    # Permanently delete the key
    r_perm_del = await api.delete(
        f"/workspaces/{ws_id}/api-keys/{admin_key_id}?permanent=true",
        headers=ADMIN_A,
    )
    assert r_perm_del.status_code == 204

    # Key is completely gone from the list
    r_list = await api.get(f"/workspaces/{ws_id}/api-keys", headers=ADMIN_A)
    assert not any(k["id"] == admin_key_id for k in r_list.json())

    # Using the deleted key now returns unknown key 401
    r_del_try = await api.get(f"/workspaces/{ws_id}/risk/summary", headers={"X-API-Key": admin_key_secret})
    assert r_del_try.status_code == 401
    assert "unknown" in r_del_try.json()["detail"].lower()
