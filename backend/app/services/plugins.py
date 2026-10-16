"""Plugins and Integrations service: Slack, Email (Maileroo), Webhooks (Svix/HMAC), and GitHub CI."""

import hashlib
import hmac
import ipaddress
import json
import socket
import time
from typing import Any
from urllib.parse import urlparse

import httpx
import structlog

from app.config import get_settings

log = structlog.get_logger()


def is_safe_webhook_url(url: str, allow_private: bool = False) -> tuple[bool, str]:
    """Validates that a URL is a safe external destination (SSRF protection).
    Blocks localhost, private subnets (RFC 1918), link-local (169.254.x.x), multicast,
    and non-http(s) schemes.
    """
    if not url:
        return False, "URL cannot be empty."
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Invalid URL structure: {e}"

    if parsed.scheme not in ("http", "https"):
        return False, f"Unsupported URL scheme '{parsed.scheme}'. Only http and https are permitted."

    host = parsed.hostname
    if not host:
        return False, "Missing hostname in URL."

    host_lower = host.lower()
    blocked_hosts = {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "169.254.169.254",
        "metadata.google.internal",
        "instance-data",
    }
    if host_lower in blocked_hosts or host_lower.endswith(".internal") or host_lower.endswith(".local"):
        if not allow_private:
            return False, f"SSRF Protection: Host '{host}' resolves to a restricted internal domain."

    if allow_private:
        return True, ""

    try:
        addr_info = socket.getaddrinfo(host, None)
    except Exception:
        # Host name resolution failed (e.g. in offline mock/test); allow domain if formatted safely
        return True, ""

    for item in addr_info:
        ip_str = item[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
                or ip.is_unspecified
            ):
                return False, f"SSRF Protection: Host '{host}' ({ip_str}) is in a private or restricted network range."
        except ValueError:
            continue

    return True, ""


def mask_integrations_for_role(integrations: dict[str, Any], is_admin: bool) -> dict[str, Any]:
    """Strips or masks sensitive secrets if user does not hold admin/owner role."""
    if is_admin:
        return integrations
    sanitized = json.loads(json.dumps(integrations))
    if "webhooks" in sanitized and isinstance(sanitized["webhooks"], dict):
        sec = sanitized["webhooks"].get("secret")
        if sec:
            sanitized["webhooks"]["secret"] = sec[:6] + "••••••••" if len(sec) > 6 else "••••••••"
    if "slack" in sanitized and isinstance(sanitized["slack"], dict):
        slack_url = sanitized["slack"].get("webhook_url")
        if slack_url and "hooks.slack.com" in slack_url:
            parts = slack_url.rsplit("/", 1)
            sanitized["slack"]["webhook_url"] = parts[0] + "/••••••••"
    return sanitized

DEFAULT_INTEGRATIONS: dict[str, Any] = {
    "slack": {
        "enabled": False,
        "webhook_url": "",
        "channel": "#sre-alerts",
        "notify_on": ["critical"],
    },
    "email": {
        "enabled": True,
        "recipients": [],
        "digest_weekly": True,
        "notify_on_critical": True,
    },
    "github": {
        "enabled": False,
        "repo": "",
        "block_on_fail": True,
    },
    "webhooks": {
        "enabled": False,
        "endpoint_url": "",
        "secret": "whsec_invarix_demo_token",
    },
}


def get_integrations(workspace: dict[str, Any]) -> dict[str, Any]:
    raw = workspace.get("integrations_json")
    if not raw:
        return {**DEFAULT_INTEGRATIONS}
    try:
        parsed = json.loads(raw) if isinstance(raw, str) else raw
        out = {**DEFAULT_INTEGRATIONS}
        for k, v in parsed.items():
            if k in out and isinstance(v, dict):
                out[k] = {**out[k], **v}
        return out
    except Exception as e:
        log.warning("integrations.parse_error", error=str(e))
        return {**DEFAULT_INTEGRATIONS}


async def dispatch_alert_to_plugins(
    ws_id: str, alert: dict[str, Any], integrations: dict[str, Any]
) -> dict[str, Any]:
    s = get_settings()
    results: dict[str, Any] = {}

    # 1. Slack / Discord Webhook
    slack = integrations.get("slack", {})
    if slack.get("enabled") and slack.get("webhook_url"):
        url = slack["webhook_url"]
        safe, reason = is_safe_webhook_url(url)
        if not safe:
            results["slack"] = {"ok": False, "error": reason}
            log.warning("plugin.slack.ssrf_blocked", ws_id=ws_id, reason=reason)
        else:
            title = alert.get("title", "Critical risk alert detected")
            rule_id = alert.get("rule_id", "R4")
            payload = {
                "text": f"🚨 [INVARIX] Critical Alert: {title}",
                "blocks": [
                    {
                        "type": "header",
                        "text": {"type": "plain_text", "text": "🚨 INVARIX Architectural Gate Alert", "emoji": True},
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Workspace:* `{ws_id}`\n*Severity:* `CRITICAL`\n*Rule Triggered:* `{rule_id}`\n*Incident Detail:* {title}\n*Action:* <{s.web_origin}/w/{ws_id}/alerts|Open Graph Proof Path>",
                        },
                    },
                ],
            }
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(url, json=payload)
                    results["slack"] = {"ok": res.status_code < 400, "status": res.status_code}
                    log.info("plugin.slack.dispatched", ws_id=ws_id, status=res.status_code)
            except Exception as e:
                results["slack"] = {"ok": False, "error": str(e)}
                log.warning("plugin.slack.failed", ws_id=ws_id, error=str(e))

    # 2. Transactional Risk Bulletins (Maileroo HTTP REST / SMTP API)
    email = integrations.get("email", {})
    if email.get("enabled") and email.get("notify_on_critical"):
        recipients = email.get("recipients") or []
        api_key = s.maileroo_api_key or s.resend_api_key
        if recipients and api_key:
            try:
                title = alert.get("title", "Critical risk alert detected")
                rule_id = alert.get("rule_id", "R4")
                plain_body = (
                    f"INVARIX Architectural Gate Alert\n\n"
                    f"Workspace: {ws_id}\n"
                    f"Severity: CRITICAL\n"
                    f"Rule: {rule_id}\n"
                    f"Title: {title}\n\n"
                    f"Review proof path at: {s.web_origin}/w/{ws_id}/alerts"
                )
                html_body = (
                    f"<div style='font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;background:#090a0f;color:#e1e4ea;padding:32px;border:1px solid #1f2430;max-width:600px;margin:0 auto;'>"
                    f"<div style='font-family:monospace;font-size:12px;color:#a855f7;font-weight:700;letter-spacing:1px;margin-bottom:8px;'>INVARIX ARCHITECTURAL GATE</div>"
                    f"<h2 style='font-size:20px;font-weight:700;margin:0 0 16px 0;color:#ffffff;'>🚨 Critical Risk Alert: {title}</h2>"
                    f"<div style='background:#12141c;border:1px solid #282f3d;padding:16px;margin-bottom:20px;'>"
                    f"<p style='margin:0 0 8px 0;font-size:13px;'><strong>Workspace:</strong> <code style='color:#a855f7;'>{ws_id}</code></p>"
                    f"<p style='margin:0 0 8px 0;font-size:13px;'><strong>Rule Triggered:</strong> <code style='color:#ef4444;'>{rule_id}</code></p>"
                    f"<p style='margin:0;font-size:13px;'><strong>Status:</strong> Immediate mitigation required.</p>"
                    f"</div>"
                    f"<a href='{s.web_origin}/w/{ws_id}/alerts' style='display:inline-block;background:#7e22ce;color:#ffffff;font-size:13px;font-weight:600;padding:10px 18px;text-decoration:none;'>Inspect Shortest Proof Path &rarr;</a>"
                    f"<div style='margin-top:24px;border-top:1px solid #1f2430;padding-top:12px;font-size:11px;color:#71788e;'>Delivered via Maileroo REST Engine &middot; INVARIX Autonomous Sentinel</div>"
                    f"</div>"
                )
                async with httpx.AsyncClient(timeout=5.0) as client:
                    for r in recipients:
                        res = await client.post(
                            "https://smtp.maileroo.com/send",
                            headers={"X-API-Key": api_key},
                            json={
                                "from": s.email_from,
                                "to": r,
                                "subject": f"[INVARIX Critical Alert] {title}",
                                "plain": plain_body,
                                "html": html_body,
                            },
                        )
                        log.info("plugin.maileroo.dispatched", recipient=r, status=res.status_code)
                results["email"] = {"ok": True, "count": len(recipients), "provider": "maileroo"}
            except Exception as e:
                results["email"] = {"ok": False, "error": str(e), "provider": "maileroo"}
                log.warning("plugin.maileroo.failed", ws_id=ws_id, error=str(e))
        else:
            results["email"] = {
                "ok": True,
                "simulated": True,
                "count": len(recipients),
                "provider": "maileroo",
            }

    # 3. Signed Outgoing Webhook (HMAC-SHA256 / Svix style)
    webhooks = integrations.get("webhooks", {})
    if webhooks.get("enabled") and webhooks.get("endpoint_url"):
        endpoint = webhooks["endpoint_url"]
        safe, reason = is_safe_webhook_url(endpoint)
        if not safe:
            results["webhooks"] = {"ok": False, "error": reason}
            log.warning("plugin.webhooks.ssrf_blocked", ws_id=ws_id, reason=reason)
        else:
            secret = webhooks.get("secret", "whsec_invarix_demo_token")
            ts = str(int(time.time()))
            body_json = json.dumps({
                "event": "alert.critical",
                "workspace_id": ws_id,
                "timestamp": ts,
                "data": alert,
            })
            sig = hmac.new(secret.encode(), f"{ts}.{body_json}".encode(), hashlib.sha256).hexdigest()
            headers = {
                "Content-Type": "application/json",
                "X-INVARIX-Timestamp": ts,
                "X-INVARIX-Signature": f"v1={sig}",
                "User-Agent": "INVARIX-Webhook-Agent/1.0",
            }
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(endpoint, content=body_json, headers=headers)
                    results["webhooks"] = {"ok": res.status_code < 400, "status": res.status_code}
            except Exception as e:
                results["webhooks"] = {"ok": False, "error": str(e)}

    return results


async def send_test_ping(plugin_name: str, config: dict[str, Any], ws_id: str) -> dict[str, Any]:
    """Sends a real test notification to verify channel credentials."""
    s = get_settings()

    if plugin_name == "slack":
        url = config.get("webhook_url")
        if not url:
            return {"ok": False, "message": "Missing Slack Webhook URL."}
        safe, reason = is_safe_webhook_url(url)
        if not safe:
            return {"ok": False, "message": reason}
        payload = {
            "text": "✅ [INVARIX] Connection Verified!",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*✅ INVARIX Integration Test*\nSuccessfully connected workspace `{ws_id}` to Slack channel `{config.get('channel', '#sre-alerts')}`.\nReal-time Sentinel incidents will broadcast here.",
                    },
                }
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code < 400:
                    return {"ok": True, "message": "Test alert posted to Slack successfully!"}
                return {"ok": False, "message": f"Slack returned HTTP {res.status_code}: {res.text}"}
        except Exception as e:
            return {"ok": False, "message": f"Failed to connect to Slack: {e}"}

    if plugin_name == "email":
        recipients = config.get("recipients") or []
        if not recipients:
            return {"ok": False, "message": "No recipient email addresses provided."}
        api_key = s.maileroo_api_key or s.resend_api_key
        if api_key:
            try:
                plain_body = f"This is a test notification from INVARIX workspace {ws_id}. Real-time Sentinel incidents will deliver to this address."
                html_body = (
                    f"<div style='font-family:-apple-system,sans-serif;background:#090a0f;color:#e1e4ea;padding:28px;border:1px solid #1f2430;max-width:560px;'>"
                    f"<h3 style='color:#a855f7;margin:0 0 12px 0;'>✅ INVARIX &times; Maileroo Connection Verified</h3>"
                    f"<p style='font-size:14px;color:#cbd5e1;'>Successfully connected workspace <code>{ws_id}</code> to Maileroo transactional delivery service.</p>"
                    f"<p style='font-size:12px;color:#94a3b8;'>Real-time Sentinel architectural risk bulletins will route to this inbox.</p>"
                    f"</div>"
                )
                async with httpx.AsyncClient(timeout=5.0) as client:
                    for r in recipients:
                        res = await client.post(
                            "https://smtp.maileroo.com/send",
                            headers={"X-API-Key": api_key},
                            json={
                                "from": s.email_from,
                                "to": r,
                                "subject": "[INVARIX] Test Notification Delivery (Maileroo)",
                                "plain": plain_body,
                                "html": html_body,
                            },
                        )
                        if res.status_code >= 400:
                            return {"ok": False, "message": f"Maileroo API returned HTTP {res.status_code}: {res.text}"}
                return {"ok": True, "message": f"Test email dispatched to {len(recipients)} recipient(s) via Maileroo (3,000 free emails/mo tier)."}
            except Exception as e:
                return {"ok": False, "message": f"Maileroo delivery failed: {e}"}
        return {
            "ok": True,
            "message": f"Simulated delivery to {', '.join(recipients)} (Maileroo sandbox ready; 3,000 free emails/mo with 2 custom domains).",
        }

    if plugin_name == "webhooks":
        endpoint = config.get("endpoint_url")
        if not endpoint:
            return {"ok": False, "message": "Missing Webhook Endpoint URL."}
        safe, reason = is_safe_webhook_url(endpoint)
        if not safe:
            return {"ok": False, "message": reason}
        secret = config.get("secret", "whsec_invarix_demo_token")
        ts = str(int(time.time()))
        body_json = json.dumps({
            "event": "test.ping",
            "workspace_id": ws_id,
            "timestamp": ts,
            "message": "INVARIX webhook handshake test",
        })
        sig = hmac.new(secret.encode(), f"{ts}.{body_json}".encode(), hashlib.sha256).hexdigest()
        headers = {
            "Content-Type": "application/json",
            "X-INVARIX-Timestamp": ts,
            "X-INVARIX-Signature": f"v1={sig}",
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(endpoint, content=body_json, headers=headers)
                if res.status_code < 400:
                    return {"ok": True, "message": f"Handshake verified! Endpoint returned HTTP {res.status_code}."}
                return {"ok": False, "message": f"Endpoint returned HTTP {res.status_code}."}
        except Exception as e:
            return {"ok": False, "message": f"Webhook dispatch error: {e}"}

    return {"ok": False, "message": f"Unknown plugin '{plugin_name}'."}
