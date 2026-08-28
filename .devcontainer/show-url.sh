#!/usr/bin/env bash
set -euo pipefail
if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  echo ""
  echo "SkyStream dashboard: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo ""
  echo "If the link requires access, open the Ports tab, find port 3000, and set its visibility appropriately."
else
  echo "SkyStream dashboard: http://localhost:3000"
fi
