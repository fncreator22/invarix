from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env_name: str = "local"
    dev_auth: bool = False  # only honored when env_name == "local"
    graph_prefix: str = "dev_"

    falkordb_host: str = "localhost"
    falkordb_port: int = 6379
    falkordb_username: str | None = None
    falkordb_password: str | None = None
    falkordb_tls: bool = False

    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_webhook_secret: str = ""
    clerk_secret_key: str = ""

    web_origin: str = "http://localhost:3000"
    internal_tick_secret: str = ""

    llm_primary: Literal["openai", "local", "compat"] = "openai"
    llm_fallback: Literal["none", "local", "compat"] = "none"
    openai_api_key: str = ""
    openai_model_agent: str = "gpt-5.1"
    openai_model_fast: str = "gpt-5.1-mini"
    local_llm_base_url: str = "http://localhost:11434/v1"
    local_llm_model: str = "qwen3:8b"
    local_llm_api_key: str = "ollama"
    compat_base_url: str = ""
    compat_api_key: str = ""
    compat_model: str = ""
    llm_timeout_s: float = 30.0
    llm_max_tool_calls: int = 6
    llm_daily_token_budget_per_ws: int = 400_000
    llm_cache_ttl_s: int = 600

    maileroo_api_key: str = ""
    resend_api_key: str = ""
    email_from: str = "Reprieve <alerts@reprieve.app>"
    sentry_dsn: str = ""

    # Simulated "today" for sample workspaces (epoch seconds): 17 Oct 2026 00:00 UTC.
    as_of_default: int = 1792195200


@lru_cache
def get_settings() -> Settings:
    return Settings()
