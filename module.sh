#!/usr/bin/env bash
set -euo pipefail
kit_root="$(cd "$(dirname "$0")" && pwd)"
exec node "$kit_root/scripts/modules.mjs" "$@"
