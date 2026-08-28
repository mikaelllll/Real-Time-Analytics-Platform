import json

from redis.asyncio import Redis

from app.core.config import get_settings
from app.models import DashboardSnapshot

SNAPSHOT_KEY = "analytics:dashboard:snapshot"


class SnapshotStore:
    def __init__(self) -> None:
        self.redis = Redis.from_url(get_settings().redis_url, decode_responses=True)

    async def save(self, snapshot: DashboardSnapshot) -> None:
        await self.redis.set(SNAPSHOT_KEY, snapshot.model_dump_json(), ex=300)

    async def get(self) -> DashboardSnapshot:
        value = await self.redis.get(SNAPSHOT_KEY)
        if value is None:
            return DashboardSnapshot()
        return DashboardSnapshot.model_validate(json.loads(value))

    async def ping(self) -> bool:
        return bool(await self.redis.ping())

    async def close(self) -> None:
        await self.redis.aclose()
