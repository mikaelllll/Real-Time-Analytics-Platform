from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.routes import router


@pytest.mark.asyncio
async def test_history_is_chronological_and_bounded() -> None:
    app = FastAPI()
    app.include_router(router)
    rows = [
        SimpleNamespace(
            collected_at=datetime(2026, 9, 5, 12, minute, tzinfo=UTC),
            aircraft_count=minute,
            airborne_count=0,
            country_count=1,
            provider_latency_ms=0.0,
        )
        for minute in [2, 1]
    ]
    session = AsyncMock()
    session.scalars.return_value = MagicMock(all=MagicMock(return_value=rows))
    context = AsyncMock()
    context.__aenter__.return_value = session
    with patch("app.api.routes.Session", return_value=context):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/history?limit=2")
            assert response.status_code == 200
            assert [row["aircraft_count"] for row in response.json()] == [1, 2]
            assert response.json()[0]["provider_latency_ms"] == 0
            statement = session.scalars.call_args.args[0]
            assert statement.compile().params["param_1"] == 2
            for limit in [0, 501]:
                assert (await client.get(f"/history?limit={limit}")).status_code == 422
