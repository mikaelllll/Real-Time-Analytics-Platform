# Backend and API

The backend uses Python 3.12 and FastAPI with an application lifespan that owns database, Redis, Kafka, and collector resources. Network and persistence operations are asynchronous. Configuration is supplied through environment variables and validated by `pydantic-settings`.

## Public endpoints

| Endpoint | Purpose |
|---|---|
| `GET /` | Service discovery |
| `GET /api/v1/health` | Runtime and Redis health |
| `GET /api/v1/snapshot` | Current typed analytics snapshot |
| `WS /api/v1/ws` | Repeating live dashboard snapshots |
| `GET /docs` | Interactive OpenAPI documentation |

Structured JSON logs include collection outcome, aircraft count, latency, and failures without storing secrets. The test suite covers provider parsing and malformed external rows; CI also enforces Ruff rules.
