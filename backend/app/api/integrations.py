import json
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth.deps import WorkspaceContext, admin, viewer
from app.models.api import Role
from app.services import plugins, workspaces
from app.services.audit import audit

router = APIRouter()


class SlackConfigIn(BaseModel):
    enabled: bool = False
    webhook_url: str = Field(default="", max_length=500)
    channel: str = Field(default="#sre-alerts", max_length=80)
    notify_on: list[str] = Field(default_factory=lambda: ["critical"])


class EmailConfigIn(BaseModel):
    enabled: bool = True
    recipients: list[str] = Field(default_factory=list, max_length=25)
    digest_weekly: bool = True
    notify_on_critical: bool = True


class GithubConfigIn(BaseModel):
    enabled: bool = False
    repo: str = Field(default="", max_length=150)
    block_on_fail: bool = True


class WebhooksConfigIn(BaseModel):
    enabled: bool = False
    endpoint_url: str = Field(default="", max_length=500)
    secret: str = Field(default="", max_length=200)


class UpdateIntegrationsRequest(BaseModel):
    slack: SlackConfigIn | None = None
    email: EmailConfigIn | None = None
    github: GithubConfigIn | None = None
    webhooks: WebhooksConfigIn | None = None


class TestPluginRequest(BaseModel):
    plugin: str = Field(..., max_length=50)
    config: dict[str, Any] = Field(default_factory=dict)


@router.get("/workspaces/{ws_id}/integrations")
async def get_integrations(ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    raw = plugins.get_integrations(ctx.workspace)
    return plugins.mask_integrations_for_role(raw, is_admin=ctx.at_least(Role.admin))


@router.put("/workspaces/{ws_id}/integrations")
async def update_integrations(
    body: UpdateIntegrationsRequest, ctx: WorkspaceContext = Depends(admin)
) -> dict[str, Any]:
    current = plugins.get_integrations(ctx.workspace)
    data = body.model_dump(exclude_unset=True)
    updated = {**current}
    for k, v in data.items():
        if k in updated and isinstance(v, dict):
            # Retain secret if sent as mask or blank
            if k == "webhooks" and "secret" in v:
                if not v["secret"] or "••••" in v["secret"]:
                    v["secret"] = updated["webhooks"].get("secret", "whsec_invarix_demo_token")
            # Retain Slack token if sent as mask
            if k == "slack" and "webhook_url" in v:
                if "••••" in v["webhook_url"]:
                    v["webhook_url"] = updated["slack"].get("webhook_url", "")
            updated[k] = {**updated[k], **v}
        else:
            updated[k] = v

    await workspaces.set_fields(
        ctx.platform, ctx.ws_id, integrations_json=json.dumps(updated)
    )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="integrations.updated",
        target_kind="Workspace",
        target_id=ctx.ws_id,
        diff={"keys_updated": list(data.keys())},
    )
    return plugins.mask_integrations_for_role(updated, is_admin=True)


@router.post("/workspaces/{ws_id}/integrations/test")
async def test_integration(
    body: TestPluginRequest, ctx: WorkspaceContext = Depends(admin)
) -> dict[str, Any]:
    return await plugins.send_test_ping(body.plugin, body.config, ctx.ws_id)
