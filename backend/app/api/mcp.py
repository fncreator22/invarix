"""MCP tool endpoint — exposes Reprieve's graph tools to any MCP-compatible client.

This follows the Model Context Protocol (MCP) tool-call convention so external
agents (Claude, Cursor, Copilot) can call Reprieve's prediction, proof-path, and
risk tools directly from their own sessions.

Endpoints:
  GET  /workspaces/{ws_id}/mcp/tools          — list available tools
  POST /workspaces/{ws_id}/mcp/tools/{name}   — call a tool by name
"""

import json
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.agents import tools
from app.auth.deps import WorkspaceContext, viewer
from app.errors import ApiError

router = APIRouter(prefix="/workspaces/{ws_id}/mcp", tags=["mcp"])


class ToolCallBody(BaseModel):
    """Flexible dict payload — the tool's own Pydantic model validates it."""

    model_config = {"extra": "allow"}


@router.get("/tools", summary="List available MCP tools")
async def list_mcp_tools(ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    """Return all Reprieve tools in MCP tool-list format.

    Compatible with Claude Desktop, Cursor, and any MCP-aware agent that can
    POST to /mcp/tools/{name} with a JSON body.
    """
    return {
        "tools": [
            {
                "name": name,
                "description": desc,
                "inputSchema": model.model_json_schema(),
            }
            for name, (model, _, desc) in tools.TOOLS.items()
        ]
    }


@router.post("/tools/{tool_name}", summary="Call a Reprieve tool via MCP")
async def call_mcp_tool(
    tool_name: str,
    body: dict[str, Any],
    ctx: WorkspaceContext = Depends(viewer),
) -> dict[str, Any]:
    """Execute a Reprieve tool and return the result in MCP content format.

    The body is passed directly to the tool's Pydantic argument model.
    Errors are returned as MCP-compatible error content (isError=True).

    Example — predict avalanche centrality for payments-gateway:
      POST /workspaces/{ws_id}/mcp/tools/predict_avalanche
      {"service_id": "svc_payments_gateway"}

    Example — show proof path between two nodes:
      POST /workspaces/{ws_id}/mcp/tools/proof_path
      {"from_id": "exc_gw_rate_limit", "to_id": "svc_checkout_api"}
    """
    if tool_name not in tools.TOOLS:
        raise ApiError("NOT_FOUND", f"Tool '{tool_name}' not found. Call GET /mcp/tools to list available tools.")

    result = await tools.execute(ctx, tool_name, json.dumps(body))

    # Return MCP-compatible content envelope
    is_error = isinstance(result.data, dict) and "error" in result.data
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(result.data, default=str),
            }
        ],
        "isError": is_error,
        "_meta": {
            "summary": result.summary,
            "tool": tool_name,
            "workspace_id": ctx.ws_id,
        },
    }
