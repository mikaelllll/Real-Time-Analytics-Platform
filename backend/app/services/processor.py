import asyncio
import json
from collections import Counter, defaultdict
from datetime import UTC, datetime

import structlog
from aiokafka import AIOKafkaConsumer

from app.core.config import Settings
from app.db import CollectionRun, Session
from app.models import AircraftState, DashboardSnapshot, MapAircraft
from app.services.store import SnapshotStore

log = structlog.get_logger()


class AircraftEventProcessor:
    def __init__(self, settings: Settings, store: SnapshotStore) -> None:
        self.settings = settings
        self.store = store
        self._consumer: AIOKafkaConsumer | None = None
        self._collections: dict[str, list[AircraftState]] = defaultdict(list)
        self._completed: dict[str, tuple[int, float]] = {}

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            self.settings.kafka_topic,
            bootstrap_servers=self.settings.kafka_bootstrap_servers,
            group_id="dashboard-aggregator-v1",
            auto_offset_reset="latest",
            enable_auto_commit=False,
            value_deserializer=lambda value: json.loads(value.decode()),
        )
        for attempt in range(10):
            try:
                await self._consumer.start()
                break
            except Exception as exc:
                if attempt == 9:
                    raise
                log.warning("consumer_not_ready", attempt=attempt + 1, error=str(exc))
                await asyncio.sleep(2)
        async for message in self._consumer:
            await self._handle(message.value)
            await self._consumer.commit()

    async def stop(self) -> None:
        if self._consumer:
            await self._consumer.stop()

    async def _handle(self, event: dict) -> None:
        collection_id = event["collection_id"]
        if event["type"] == "aircraft_state":
            self._collections[collection_id].append(AircraftState.model_validate(event["data"]))
            await self._finalise_if_complete(collection_id)
            return
        if event["type"] != "collection_complete":
            return
        self._completed[collection_id] = (int(event["expected_count"]), float(event["latency_ms"]))
        await self._finalise_if_complete(collection_id)

    async def _finalise_if_complete(self, collection_id: str) -> None:
        completion = self._completed.get(collection_id)
        if completion is None or len(self._collections[collection_id]) < completion[0]:
            return
        expected_count, latency = self._completed.pop(collection_id)
        states = self._collections.pop(collection_id)
        snapshot = self.build_snapshot(states[:expected_count], latency, self.settings.collection_interval_seconds)
        await self.store.save(snapshot)
        async with Session() as session:
            session.add(CollectionRun(
                aircraft_count=snapshot.aircraft_tracked,
                airborne_count=snapshot.airborne,
                country_count=snapshot.countries,
                provider_latency_ms=snapshot.provider_latency_ms or 0,
            ))
            await session.commit()
        log.info("collection_processed", collection_id=collection_id, aircraft=len(states))

    @staticmethod
    def build_snapshot(states: list[AircraftState], latency: float, interval: int) -> DashboardSnapshot:
        airborne = [state for state in states if not state.on_ground]
        altitudes = [state.altitude_m for state in airborne if state.altitude_m is not None]
        speeds = [state.velocity_ms * 3.6 for state in airborne if state.velocity_ms is not None]
        countries = Counter(state.origin_country for state in states)
        # Every position supplied by OpenSky is retained. The dashboard renders these through
        # Leaflet's canvas renderer, avoiding thousands of individual SVG/DOM nodes.
        mappable = [
            MapAircraft.model_validate(state.model_dump(), from_attributes=True)
            for state in states
            if state.latitude is not None and state.longitude is not None
        ]
        return DashboardSnapshot(
            status="healthy", aircraft_tracked=len(states),
            aircraft_with_position=len(mappable), airborne=len(airborne),
            on_ground=len(states) - len(airborne), countries=len(countries),
            average_altitude_m=round(sum(altitudes) / len(altitudes), 1) if altitudes else 0,
            average_speed_kmh=round(sum(speeds) / len(speeds), 1) if speeds else 0,
            ingestion_rate=round(len(states) / interval, 1), last_updated=datetime.now(UTC),
            provider_latency_ms=round(latency, 1), message="Live telemetry is flowing normally",
            top_countries=[{"country": country, "count": count} for country, count in countries.most_common(8)],
            aircraft=mappable,
        )
