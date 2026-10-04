#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$project_root/.workflow/runtime/cli.mjs" session-start
