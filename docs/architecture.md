# System architecture

## Responsibilities

The FastAPI service owns collection orchestration and public delivery. Its asynchronous collector polls OpenSky at a conservative configurable interval, validates rows into typed models, publishes each valid state to the Kafka-compatible broker, derives a dashboard snapshot, caches that snapshot in Redis, and records a collection summary in PostgreSQL.

Kafka is not used as decorative infrastructure: each aircraft state becomes an independently transportable event keyed by ICAO24. This permits future consumer groups for geofencing, anomaly detection, archival, alerting, or regional aggregation without changing ingestion.

Redis is deliberately used for ephemeral, latency-sensitive dashboard state. PostgreSQL is deliberately used for durable relational history. The browser receives a snapshot every three seconds through a WebSocket while collection occurs independently.

## Failure behaviour

- External calls have bounded timeouts.
- Kafka startup retries while the broker becomes ready.
- Provider errors preserve the last successful snapshot and mark it degraded.
- No synthetic aircraft are substituted.
- Docker health checks and restart policies recover failed services.
- Shutdown stops collection, flushes Kafka, and closes pools.

## Scaling path

The portfolio deployment keeps collection and delivery together to fit Codespaces. At larger scale, the collector, Kafka consumers, WebSocket gateway, and aggregation workers can be separated. Kafka partitions provide horizontal consumer parallelism, and PostgreSQL history can be partitioned by collection time.
