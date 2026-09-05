from datetime import datetime

from pydantic import BaseModel, Field


class AircraftState(BaseModel):
    icao24: str
    callsign: str | None = None
    origin_country: str
    observed_at: datetime
    longitude: float | None = Field(default=None, ge=-180, le=180)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    altitude_m: float | None = None
    on_ground: bool
    velocity_ms: float | None = None
    heading: float | None = None
    vertical_rate_ms: float | None = None
    category: int | None = None


class MapAircraft(BaseModel):
    """Compact aircraft representation sent to dashboard clients."""

    icao24: str
    callsign: str | None = None
    origin_country: str
    longitude: float = Field(ge=-180, le=180)
    latitude: float = Field(ge=-90, le=90)
    altitude_m: float | None = None
    on_ground: bool
    velocity_ms: float | None = None
    heading: float | None = None


class DashboardSnapshot(BaseModel):
    status: str = "starting"
    provider: str = "OpenSky Network"
    aircraft_tracked: int = 0
    aircraft_with_position: int = 0
    airborne: int = 0
    on_ground: int = 0
    countries: int = 0
    average_altitude_m: float = 0
    average_speed_kmh: float = 0
    ingestion_rate: float = 0
    last_updated: datetime | None = None
    provider_latency_ms: float | None = None
    message: str = "Waiting for the first OpenSky collection"
    top_countries: list[dict[str, int | str]] = Field(default_factory=list)
    aircraft: list[MapAircraft] = Field(default_factory=list)


class CollectionHistory(BaseModel):
    collected_at: datetime
    aircraft_count: int
    airborne_count: int
    country_count: int
    provider_latency_ms: float
