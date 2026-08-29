# Data source and limitations

Live state vectors are supplied by the [OpenSky Network](https://opensky-network.org/). A state may include ICAO24 identifier, callsign, origin country inferred from registration, coordinates, altitude, ground state, velocity, heading, vertical rate, and aircraft category.

The live feed does not guarantee airline, departure airport, destination airport, passenger schedule, or complete global coverage. Fields can be null because reception depends on aircraft broadcasts and receiver coverage. OpenSky may rate-limit anonymous access and may be temporarily unavailable.

The project polls conservatively and shows a degraded status when collection fails. It does not fabricate replacement telemetry. Map tiles and geographic presentation are attributed to OpenStreetMap contributors in the dashboard.

## Data lifecycle

The application receives public aircraft telemetry only; visitors do not upload files or personal information. The latest complete map snapshot is cached in Redis with a five-minute expiry that is refreshed by successful or degraded updates. PostgreSQL stores collection-level counts and latency, not individual aircraft histories. Docker volumes exist only inside the local machine or Codespace and are removed when that Codespace is deleted, unless the operator exports them independently.
