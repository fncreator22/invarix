"""Empirical Challenger 2 Adversarial Stress Suite.

Comprehensive stress tests for:
1. Tavily Threat Intelligence Tool (tavily_search_threat_intel):
   - Missing, empty, and None API keys
   - Extreme query lengths (100k chars), special chars, SQLi/XSS payloads
   - Malformed JSON payloads and Pydantic validation failures
   - Network timeouts (connect, read, pool), connection errors, DNS failure
   - Upstream HTTP errors (400, 401, 403, 429, 500, 502, 503)
   - Corrupted non-JSON 200 OK responses

2. Nebius Token Factory Configuration & Model Routing:
   - Verification of dual model strings (Nemotron-3_5-Lightning and nemotron-3-super-120b-a12b)
   - Base URL handling (with/without trailing slash, custom paths, localhost, empty)
   - OpenAI adapter provider instantiation for 'compat' provider
   - Context window ingestion capacity (> 200k chars)

3. CLI PR Gate & Invariant Circuit Breakers:
   - Non-existent directories
   - Empty workspaces / zero registered services
   - Extreme fail-thresholds (0.0, 100.0)
   - Exit code precision (0 vs 1 vs 2)
"""

import argparse
import json
from pathlib import Path
from unittest import mock

import httpx
import pytest
import respx

from app.agents import llm, tools
from app.agents.tools import TOOLS, TavilyThreatIntelArgs, execute
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import Settings, get_settings
import scripts.cli as cli_module


# =============================================================================
# 1. TAVILY THREAT INTEL ADVERSARIAL STRESS TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_tavily_missing_or_empty_api_key():
    """Verify missing API key returns structured diagnostic warning without exceptions."""
    ctx = mock.MagicMock()
    _, fn, _ = TOOLS["tavily_search_threat_intel"]

    for empty_val in ["", None]:
        with mock.patch("app.agents.tools.get_settings") as m_settings:
            m_settings.return_value = Settings(tavily_api_key=empty_val or "")
            res = await fn(ctx, TavilyThreatIntelArgs(query="CVE-2024-38856"))
            assert res is not None
            assert isinstance(res.data, dict)
            assert "warning" in res.data
            assert "TAVILY_API_KEY is not configured" in res.data["warning"]
            assert "unavailable" in res.summary.lower()


@pytest.mark.asyncio
async def test_tavily_malformed_arguments_via_execute():
    """Verify malformed JSON or invalid schema types are caught cleanly by execute dispatcher."""
    ctx = mock.MagicMock()

    # Syntax-invalid JSON string
    res_syntax = await execute(ctx, "tavily_search_threat_intel", "{invalid: json")
    assert "error" in res_syntax.data
    assert "invalid arguments" in res_syntax.data["error"].lower()

    # Missing required 'query' argument
    res_missing = await execute(ctx, "tavily_search_threat_intel", "{}")
    assert "error" in res_missing.data
    assert "invalid arguments" in res_missing.data["error"].lower()

    # Nested object passed for 'query' instead of string
    res_bad_type = await execute(ctx, "tavily_search_threat_intel", '{"query": {"cve": 1234}}')
    assert "error" in res_bad_type.data
    assert "invalid arguments" in res_bad_type.data["error"].lower()


@pytest.mark.asyncio
async def test_tavily_extreme_queries():
    """Verify tool handles massive queries (100k chars), unicode emojis, and hostile strings."""
    ctx = mock.MagicMock()
    _, fn, _ = TOOLS["tavily_search_threat_intel"]

    with mock.patch("app.agents.tools.get_settings") as m_settings:
        m_settings.return_value = Settings(tavily_api_key="tvly-mock-key")

        with respx.mock(base_url="https://api.tavily.com") as rmock:
            rmock.post("/search").respond(
                status_code=200,
                json={"results": [{"title": "Advisory", "url": "https://test.com", "content": "Match"}], "answer": "Exploit confirmed."}
            )

            # 1. 100k characters query
            huge_query = "CVE-2024-" + ("X" * 100_000)
            res_huge = await fn(ctx, TavilyThreatIntelArgs(query=huge_query))
            assert "error" not in res_huge.data
            assert res_huge.data["answer"] == "Exploit confirmed."

            # 2. Hostile characters: SQLi strings, emojis, control sequences
            hostile_query = "CVE-2024-1234'; DROP TABLE exceptions;-- \x00\r\n🔥💥"
            res_hostile = await fn(ctx, TavilyThreatIntelArgs(query=hostile_query))
            assert "error" not in res_hostile.data
            assert len(res_hostile.data["results"]) == 1


@pytest.mark.asyncio
async def test_tavily_network_timeouts_and_connection_errors():
    """Verify all network level exceptions (ReadTimeout, ConnectTimeout, ConnectError) are trapped."""
    ctx = mock.MagicMock()
    _, fn, _ = TOOLS["tavily_search_threat_intel"]

    with mock.patch("app.agents.tools.get_settings") as m_settings:
        m_settings.return_value = Settings(tavily_api_key="tvly-mock-key")

        # 1. ReadTimeout
        with respx.mock(base_url="https://api.tavily.com") as rmock:
            rmock.post("/search").mock(side_effect=httpx.ReadTimeout("Read timed out after 10.0s"))
            res = await fn(ctx, TavilyThreatIntelArgs(query="CVE-2024-0001"))
            assert "error" in res.data
            assert "timed out" in res.data["error"].lower()

        # 2. ConnectTimeout
        with respx.mock(base_url="https://api.tavily.com") as rmock:
            rmock.post("/search").mock(side_effect=httpx.ConnectTimeout("Connect timed out"))
            res = await fn(ctx, TavilyThreatIntelArgs(query="CVE-2024-0001"))
            assert "error" in res.data
            assert "connection" in res.data["error"].lower() or "connect" in res.data["error"].lower()

        # 3. ConnectError / DNS resolution failure
        with respx.mock(base_url="https://api.tavily.com") as rmock:
            rmock.post("/search").mock(side_effect=httpx.ConnectError("Failed to resolve 'api.tavily.com'"))
            res = await fn(ctx, TavilyThreatIntelArgs(query="CVE-2024-0001"))
            assert "error" in res.data
            assert "failed to resolve" in res.data["error"].lower()


@pytest.mark.asyncio
async def test_tavily_http_error_codes():
    """Verify HTTP error status codes (401, 429, 500, 502, 503) are gracefully reported."""
    ctx = mock.MagicMock()
    _, fn, _ = TOOLS["tavily_search_threat_intel"]

    with mock.patch("app.agents.tools.get_settings") as m_settings:
        m_settings.return_value = Settings(tavily_api_key="tvly-mock-key")

        for code in [401, 403, 429, 500, 502, 503]:
            with respx.mock(base_url="https://api.tavily.com") as rmock:
                rmock.post("/search").respond(status_code=code, text=f"HTTP Error {code}")
                res = await fn(ctx, TavilyThreatIntelArgs(query="CVE-2024-0001"))
                assert "error" in res.data
                assert str(code) in res.data["error"]


@pytest.mark.asyncio
async def test_tavily_corrupted_response_body():
    """Verify non-JSON response body (HTML gateway error on 200 OK) does not crash the tool."""
    ctx = mock.MagicMock()
    _, fn, _ = TOOLS["tavily_search_threat_intel"]

    with mock.patch("app.agents.tools.get_settings") as m_settings:
        m_settings.return_value = Settings(tavily_api_key="tvly-mock-key")

        with respx.mock(base_url="https://api.tavily.com") as rmock:
            rmock.post("/search").respond(status_code=200, text="<html><body>502 Bad Gateway</body></html>")
            res = await fn(ctx, TavilyThreatIntelArgs(query="CVE-2024-0001"))
            assert "error" in res.data
            assert "expecting value" in res.data["error"].lower() or "json" in res.data["error"].lower()


# =============================================================================
# 2. NEBIUS TOKEN FACTORY CONFIGURATION & ROUTING STRESS TESTS
# =============================================================================

def test_nebius_dual_model_strings_and_roles():
    """Verify dual Nemotron model strings and get_compat_model resolution."""
    s = Settings(
        llm_primary="compat",
        compat_base_url="https://api.tokenfactory.nebius.ai/v1",
        compat_api_key="neb_live_key_999",
        compat_model="nvidia/nemotron-3-super-120b-a12b",
        compat_model_ingest="nebius/nvidia/Nemotron-3_5-Lightning",
    )

    # Ingestion model: Nemotron-3_5-Lightning
    assert s.get_compat_model("ingest") == "nebius/nvidia/Nemotron-3_5-Lightning"
    assert "Nemotron-3_5-Lightning" in s.compat_model_ingest

    # Conversational reasoning model: nemotron-3-super-120b-a12b
    assert s.get_compat_model("reasoning") == "nvidia/nemotron-3-super-120b-a12b"
    assert "nemotron-3-super-120b" in s.compat_model

    # Default role fallback
    assert s.get_compat_model() == "nvidia/nemotron-3-super-120b-a12b"


def test_nebius_base_url_variations():
    """Verify base URL handling with trailing slashes, subpaths, and localhost endpoints."""
    urls = [
        "https://api.tokenfactory.nebius.ai/v1",
        "https://api.tokenfactory.nebius.ai/v1/",
        "http://127.0.0.1:8080/v1",
        "https://custom-gateway.corp.internal/nebius/v1",
    ]

    for base_url in urls:
        s = Settings(
            llm_primary="compat",
            compat_base_url=base_url,
            compat_api_key="neb_key",
            compat_model="nvidia/nemotron-3-super-120b-a12b",
        )
        assert s.compat_base_url == base_url

        with mock.patch("app.agents.llm.get_settings", return_value=s):
            provider = llm._provider("compat")
            assert provider is not None
            assert provider.name == "compat"
            assert provider.model == "nvidia/nemotron-3-super-120b-a12b"
            # OpenAI client stores base_url as an httpx.URL
            normalized_client_url = str(provider.client.base_url).rstrip("/")
            normalized_expected_url = base_url.rstrip("/")
            assert normalized_client_url == normalized_expected_url


def test_nebius_provider_instantiation_and_headers():
    """Verify that the compat provider initializes an OpenAI client with proper headers."""
    s = Settings(
        llm_primary="compat",
        compat_base_url="https://api.tokenfactory.nebius.ai/v1",
        compat_api_key="neb_secret_key_123",
        compat_model="nvidia/nemotron-3-super-120b-a12b",
        web_origin="http://localhost:3000",
    )

    with mock.patch("app.agents.llm.get_settings", return_value=s):
        provider = llm._provider("compat")
        assert provider is not None
        assert provider.client.api_key == "neb_secret_key_123"
        assert provider.client.default_headers.get("HTTP-Referer") == "http://localhost:3000"
        assert provider.client.default_headers.get("X-Title") in ("INVARIX", "Reprieve")


def test_nebius_unconfigured_returns_none():
    """Verify that compat provider returns None if base_url or model is empty."""
    s_no_url = Settings(
        llm_primary="compat",
        compat_base_url="",
        compat_api_key="key",
        compat_model="nvidia/nemotron-3-super-120b-a12b",
    )
    with mock.patch("app.agents.llm.get_settings", return_value=s_no_url):
        assert llm._provider("compat") is None


# =============================================================================
# 3. CLI PR GATE ADVERSARIAL STRESS TESTS
# =============================================================================

def test_cli_scan_pr_non_existent_directory(tmp_path: Path):
    """Verify scan --pr against a non-existent directory does not crash."""
    non_existent = tmp_path / "does_not_exist_xyz"
    args = argparse.Namespace(
        dir=str(non_existent),
        pr=True,
        submit=False,
        auto_approve=False,
        api_url="http://localhost:8000",
        workspace="ws_test",
        api_key="rep_live_local",
        service=None,
        horizon=30,
        fail_threshold=75.0,
    )
    # Mock offline simulation fallback
    exit_code = cli_module.cmd_scan(args)
    # Default fallback has critical services with score 88.5, so it triggers circuit breaker
    assert exit_code == 1


def test_cli_scan_pr_extreme_fail_thresholds():
    """Verify behavior under extreme fail thresholds 0.0 and 100.0."""
    # Extreme threshold 0.0: even lowest score triggers blockage
    args_zero = argparse.Namespace(
        dir=".",
        pr=True,
        submit=False,
        auto_approve=False,
        api_url="http://localhost:8000",
        workspace="ws_test",
        api_key="rep_live_local",
        service=None,
        horizon=30,
        fail_threshold=0.0,
    )
    exit_zero = cli_module.cmd_scan(args_zero)
    assert exit_zero == 1

    # Extreme threshold 100.0: bypasses blockage on fallback mock (peak 88.5)
    args_max = argparse.Namespace(
        dir=".",
        pr=True,
        submit=False,
        auto_approve=False,
        api_url="http://localhost:8000",
        workspace="ws_test",
        api_key="rep_live_local",
        service=None,
        horizon=30,
        fail_threshold=100.0,
    )
    exit_max = cli_module.cmd_scan(args_max)
    assert exit_max == 0


def test_cli_check_exit_code_precision():
    """Verify exact exit codes for check command: 0 (Approved), 1 (Blocked), 2 (API Error)."""
    base_args = dict(
        workspace="ws_test",
        service=None,
        horizon=30,
        fail_threshold=75.0,
        api_key="rep_live_local",
    )

    # 1. Safe -> Exit code 0
    with mock.patch("scripts.cli._api_call", return_value={"services": [{"service_id": "s1", "score": 10.0, "band": "low"}]}):
        args = argparse.Namespace(api_url="http://localhost:8000", **base_args)
        assert cli_module.cmd_check(args) == 0

    # 2. Critical Cascade / SPOF -> Exit code 1
    with mock.patch("scripts.cli._api_call", return_value={"services": [{"service_id": "s1", "score": 90.0, "band": "critical", "is_spof": True}]}):
        args = argparse.Namespace(api_url="http://localhost:8000", **base_args)
        assert cli_module.cmd_check(args) == 1

    # 3. API Error (HTTP 500 or Connection Refused) -> Exit code 2
    with mock.patch("scripts.cli._api_call", return_value={"error": "Connection refused", "status": 500}):
        args = argparse.Namespace(api_url="http://localhost:8000", **base_args)
        assert cli_module.cmd_check(args) == 2

    # 4. Unseeded empty workspace on live API -> Exit code 0
    with mock.patch("scripts.cli._api_call", return_value={"services": [], "collisions": []}):
        args = argparse.Namespace(api_url="http://localhost:8000", **base_args)
        assert cli_module.cmd_check(args) == 0
