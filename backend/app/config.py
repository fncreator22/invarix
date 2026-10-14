from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    falkordb_url: str = "redis://localhost:6379"
    falkordb_tls: bool = False
    graph_prefix: str = "dev_"
    port: int = 8000
    env_name: str = "local"
    web_origin: str = "http://localhost:3000"
    internal_tick_secret: str = "dev_secret"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
