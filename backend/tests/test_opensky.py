from app.services.opensky import OpenSkyCollector
from app.services.processor import AircraftEventProcessor


def test_parse_valid_state() -> None:
    row = [
        "abc123", "TEST1   ", "Brazil", 0, 0, -50.0, -20.0, 10000.0, False,
        250.0, 180.0, 2.0, None, 10100.0, None, False, 0, 3,
    ]
    result = OpenSkyCollector._parse({"time": 1_700_000_000, "states": [row]})
    assert len(result) == 1
    assert result[0].callsign == "TEST1"
    assert result[0].velocity_ms == 250.0


def test_parse_ignores_malformed_rows() -> None:
    assert OpenSkyCollector._parse({"states": [["too-short"]]}) == []


def test_snapshot_keeps_every_valid_position() -> None:
    row = [
        "abc123", "TEST1", "Brazil", 0, 0, -50.0, -20.0, 10000.0, False,
        250.0, 180.0, 2.0, None, 10100.0, None, False, 0, 3,
    ]
    state = OpenSkyCollector._parse({"time": 1_700_000_000, "states": [row]})[0]
    states = [state.model_copy(update={"icao24": f"{index:06x}"}) for index in range(2_000)]

    snapshot = AircraftEventProcessor.build_snapshot(states, latency=100, interval=30)

    assert snapshot.aircraft_tracked == 2_000
    assert snapshot.aircraft_with_position == 2_000
    assert len(snapshot.aircraft) == 2_000
