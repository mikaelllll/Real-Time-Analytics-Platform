import asyncio
import json
import time
from datetime import UTC, datetime
from uuid import uuid4

import httpx
import structlog
from aiokafka import AIOKafkaProducer

from app.core.config import Settings
from app.models import AircraftState
from app.services.store import SnapshotStore

log = structlog.get_logger()


class OpenSkyCollector:
    def __init__(self, settings: Settings, store: SnapshotStore) -> None:
        self.settings = settings
        self.store = store
        self._stop = asyncio.Event()
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=self.settings.kafka_bootstrap_servers,
            value_serializer=lambda value: json.dumps(value).encode(),
            acks="all",
        )
        for attempt in range(10):
            try:
                await self._producer.start()
                break
            except Exception as exc:
                if attempt == 9:
                    raise
                log.warning("kafka_not_ready", attempt=attempt + 1, error=str(exc))
                await asyncio.sleep(2)
        while not self._stop.is_set():
            await self.collect_once()
            try:
                await asyncio.wait_for(self._stop.wait(), self.settings.collection_interval_seconds)
            except TimeoutError:
                pass

    async def stop(self) -> None:
        self._stop.set()
        if self._producer:
            await self._producer.stop()

    async def collect_once(self) -> None:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=25) as client:
                response = await client.get(self.settings.opensky_url)
                response.raise_for_status()
            states = self._parse(response.json())
            latency = (time.perf_counter() - started) * 1000
            collection_id = str(uuid4())
            if self._producer:
                for state in states:
                    await self._producer.send(
                        self.settings.kafka_topic,
                        {
                            "type": "aircraft_state", "collection_id": collection_id,
                            "data": state.model_dump(mode="json"),
                        },
                        key=state.icao24.encode(),
                    )
                await self._producer.send(
                    self.settings.kafka_topic,
                    {
                        "type": "collection_complete", "collection_id": collection_id,
                        "latency_ms": latency, "expected_count": len(states),
                    },
                )
                await self._producer.flush()
            log.info("collection_published", collection_id=collection_id, aircraft=len(states))
        except Exception as exc:
            previous = await self.store.get()
            previous.status = "degraded"
            previous.message = f"OpenSky is temporarily unavailable: {type(exc).__name__}"
            await self.store.save(previous)
            log.warning("collection_failed", error=str(exc))

    @staticmethod
    def _parse(payload: dict) -> list[AircraftState]:
        observed_at = datetime.fromtimestamp(payload.get("time", time.time()), tz=UTC)
        result: list[AircraftState] = []
        for row in payload.get("states") or []:
            if not row or len(row) < 17:
                continue
            result.append(AircraftState(
                icao24=row[0], callsign=row[1].strip() if row[1] else None,
                origin_country=row[2] or "Unknown", observed_at=observed_at,
                longitude=row[5], latitude=row[6], altitude_m=row[7], on_ground=bool(row[8]),
                velocity_ms=row[9], heading=row[10], vertical_rate_ms=row[11],
                category=row[17] if len(row) > 17 else None,
            ))
        return result
