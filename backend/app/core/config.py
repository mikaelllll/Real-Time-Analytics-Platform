from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "SkyStream Analytics API"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://analytics:analytics@postgres:5432/analytics"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "redpanda:9092"
    kafka_topic: str = "aircraft.states.v1"
    opensky_url: str = "https://opensky-network.org/api/states/all"
    opensky_client_id: str | None = None
    opensky_client_secret: str | None = None
    collection_interval_seconds: int = Field(default=30, ge=10, le=3600)
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
