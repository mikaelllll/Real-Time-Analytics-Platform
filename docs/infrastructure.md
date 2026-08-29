# Infrastructure and Codespaces

Docker Compose defines frontend, API, PostgreSQL, Redis, and Redpanda services. Dependency health gates prevent the API from starting before its required infrastructure. Named volumes preserve database state across ordinary restarts.

The dev container installs Docker-in-Docker, builds images after creation, and starts the stack whenever the Codespace starts. Port 3000 is forwarded with a notification but is not opened automatically. Run `bash .devcontainer/show-url.sh` after activating the terminal to print the correct Codespaces URL.

The CI workflow runs on main pushes, pull requests, and manual dispatch. It separately verifies Python linting, formatting and tests; frontend linting, formatting and production compilation; and a full Docker Compose build, health-gated startup, and HTTP smoke test. Dependabot checks Python, npm, Docker, and GitHub Actions dependencies on a schedule.

Redpanda uses a current supported release for the Kafka-compatible development broker. This single-node Compose topology is intentionally sized for a Codespace demonstration; a real production deployment would use a replicated managed cluster or a supported multi-node deployment.

PostgreSQL, Redis, and Redpanda use development-only network settings inside the isolated Compose network. The fixed database password is not a production credential. PostgreSQL and Redis use named volumes; the demonstration's Kafka event log is intentionally ephemeral and can be reconstructed from the next OpenSky collection.
