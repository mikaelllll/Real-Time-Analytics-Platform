#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
docker compose build
echo "SkyStream images built successfully. Services start automatically when the Codespace starts."
echo "Run 'bash .devcontainer/show-url.sh' when you are ready to open the dashboard."
