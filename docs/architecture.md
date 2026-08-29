# System architecture

## Responsibilities

The FastAPI service owns collection orchestration and public delivery. Its asynchronous collector polls OpenSky at a conservative configurable interval, validates rows into typed models, and publishes each valid state to the Kafka-compatible broker. The analytics consumer reconstructs complete collections, derives the dashboard snapshot, caches it in Redis, and records a summary in PostgreSQL.

Kafka is not used as decorative infrastructure: each aircraft state becomes an independently transportable event. Events are keyed by collection ID so every global snapshot and its completion boundary remain ordered on one partition. Additional consumer groups can add geofencing, anomaly detection, archival, alerting, or regional aggregation without changing ingestion.

Redis is deliberately used for ephemeral, latency-sensitive dashboard state. PostgreSQL is deliberately used for durable relational history. A WebSocket sends the browser an initial snapshot and then sends again only when data or health changes.

## Failure behaviour

- External calls have bounded timeouts.
- Kafka startup retries while the broker becomes ready.
- Kafka offsets are committed only after a complete collection is aggregated and persisted.
- Incomplete collections are bounded and discarded after a safe timeout.
- Provider errors preserve the last successful snapshot and mark it degraded.
- Invalid provider rows are skipped without rejecting the remaining collection.
- No synthetic aircraft are substituted.
- Docker health checks and restart policies recover failed services.
- Health checks include Redis plus both background pipeline tasks.
- Shutdown stops collection, closes Kafka clients, and closes database/Redis pools.

## Scaling path

The portfolio deployment keeps collection and delivery together to fit Codespaces. At larger scale, the collector, Kafka consumers, WebSocket gateway, and aggregation workers can be separated. Kafka partitions provide horizontal consumer parallelism, and PostgreSQL history can be partitioned by collection time.

Dashboard aircraft use a compact projection that omits ingestion-only fields. WebSocket clients receive a new payload only when the provider snapshot or health state changes, rather than repeatedly downloading an unchanged global data set.
