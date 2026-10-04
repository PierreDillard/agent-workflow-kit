#!/usr/bin/env bash
set -euo pipefail
project_root="${WORKFLOW_PROJECT_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
exec node "$project_root/.workflow/runtime/cli.mjs" doctor
