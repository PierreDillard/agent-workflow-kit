#!/usr/bin/env bash
# Kept for checkouts and scripts written for 0.1; same as `ants <command>`.
set -euo pipefail
exec node "$(cd "$(dirname "$0")" && pwd)/bin/ants.mjs" "$@"
