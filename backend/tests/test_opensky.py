from app.services.opensky import OpenSkyCollector


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
