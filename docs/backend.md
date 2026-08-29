# Backend and API

The backend uses Python 3.12 and FastAPI with an application lifespan that owns database, Redis, Kafka, and collector resources. Network and persistence operations are asynchronous. Configuration is supplied through environment variables and validated by `pydantic-settings`.

## Public endpoints

| Endpoint | Purpose |
|---|---|
| `GET /` | Service discovery |
| `GET /api/v1/health` | Redis, collector, and consumer readiness |
| `GET /api/v1/snapshot` | Current typed analytics snapshot |
| `WS /api/v1/ws` | Initial and change-driven live dashboard snapshots |
| `GET /docs` | Interactive OpenAPI documentation |

Structured JSON logs include collection outcome, aircraft count, latency, and failures without storing secrets. The collector reuses a bounded asynchronous HTTP client, rejects impossible coordinates, and keeps the last valid snapshot when the provider fails. Kafka offsets are committed only after a complete collection has been aggregated and persisted, so a process interruption cannot acknowledge half a snapshot.

The test suite covers valid and malformed provider rows, coordinate validation, uncapped map delivery, records without coordinates, and incomplete Kafka collections. CI enforces Ruff linting and formatting.
