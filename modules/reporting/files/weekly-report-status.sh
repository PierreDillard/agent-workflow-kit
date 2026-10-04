#!/usr/bin/env bash
set -u
project_root="$(cd "$(dirname "$0")/../.." && pwd)" || exit 0
[ -f "$project_root/.workflow-kit.env" ] || exit 0
# Generated, shell-quoted configuration; never copy a machine's home into shared report data.
. "$project_root/.workflow-kit.env"
if ! command -v node >/dev/null; then
  printf '%s\n' 'Reporting: Node.js is unavailable; use weekly-report after installing prerequisites.'
  exit 0
fi
exec node "$project_root/.claude/scripts/weekly-report-status.mjs" "$TASKS_DIR" "$@"
