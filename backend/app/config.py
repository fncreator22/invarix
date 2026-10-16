from functools import lru_cache
from typing import Literal

from pydantic import field_validator
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

    llm_primary: Literal["openai", "local", "compat"] = "compat"
    llm_fallback: Literal["none", "local", "compat"] = "local"
    openai_api_key: str = ""
    openai_model_agent: str = "gpt-5.1"
    openai_model_fast: str = "gpt-5.1-mini"
    local_llm_base_url: str = "http://localhost:11434/v1"
    local_llm_model: str = "qwen3:8b"
    local_llm_api_key: str = "ollama"
    compat_base_url: str = "https://api.tokenfactory.nebius.ai/v1"
    compat_api_key: str = "nebius-token-factory-key"
    compat_model: str = "nvidia/nemotron-3-super-120b-a12b"
    compat_model_ingest: str = "nebius/nvidia/Nemotron-3_5-Lightning"
    llm_timeout_s: float = 30.0
    llm_max_tool_calls: int = 6
    llm_daily_token_budget_per_ws: int = 400_000
    llm_cache_ttl_s: int = 600

    @field_validator("compat_model", "compat_model_ingest", mode="before")
    @classmethod
    def validate_nemotron_model(cls, v: str) -> str:
        """Accept both 'nvidia/' and 'nebius/nvidia/' prefixes for Nemotron models."""
        if not v:
            return v
        return v

    def get_compat_model(self, role: str = "reasoning") -> str:
        """Return appropriate Nemotron model for reasoning or ingestion."""
        if role == "ingest":
            return self.compat_model_ingest
        return self.compat_model

    maileroo_api_key: str = ""
    resend_api_key: str = ""
    tavily_api_key: str = ""
    email_from: str = "Reprieve <alerts@reprieve.app>"
    sentry_dsn: str = ""

    # Simulated "today" for sample workspaces (epoch seconds): 17 Oct 2026 00:00 UTC.
    as_of_default: int = 1792195200


@lru_cache
def get_settings() -> Settings:
    return Settings()
