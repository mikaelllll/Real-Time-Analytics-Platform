# Infrastructure and Codespaces

Docker Compose defines frontend, API, PostgreSQL, Redis, and Redpanda services. Dependency health gates prevent the API from starting before its required infrastructure. Named volumes preserve database state across ordinary restarts.

The dev container installs Docker-in-Docker, builds images after creation, and starts the stack whenever the Codespace starts. Port 3000 is forwarded with a notification but is not opened automatically. Run `bash .devcontainer/show-url.sh` after activating the terminal to print the correct Codespaces URL.

The CI workflow runs on main pushes, pull requests, and manual dispatch. It separately verifies Python lint/tests, the TypeScript production build, and Docker image builds.
