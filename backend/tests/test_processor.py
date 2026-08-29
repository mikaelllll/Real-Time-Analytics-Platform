from unittest.mock import Mock

import pytest

from app.core.config import Settings
from app.services.processor import AircraftEventProcessor


@pytest.mark.asyncio
async def test_offsets_are_not_ready_to_commit_before_collection_is_complete() -> None:
    processor = AircraftEventProcessor(Settings(), Mock())
    state = {
        "icao24": "abc123",
        "callsign": "TEST1",
        "origin_country": "Brazil",
        "observed_at": "2026-08-29T00:00:00Z",
        "longitude": -50,
        "latitude": -20,
        "altitude_m": 10000,
        "on_ground": False,
        "velocity_ms": 250,
        "heading": 180,
        "vertical_rate_ms": 2,
        "category": 3,
    }

    state_result = await processor._handle(
        {
            "type": "aircraft_state",
            "collection_id": "collection-1",
            "data": state,
        }
    )
    boundary_result = await processor._handle(
        {
            "type": "collection_complete",
            "collection_id": "collection-1",
            "expected_count": 2,
            "latency_ms": 100,
        }
    )

    assert state_result is False
    assert boundary_result is False
