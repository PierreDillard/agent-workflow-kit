#!/usr/bin/env bash
set -u
kit_root="$(cd "$(dirname "$0")/.." && pwd)" || exit 0
[ -f "$kit_root/kit.env" ] || exit 0
# Generated, shell-quoted configuration; never copy a machine's home into shared report data.
. "$kit_root/kit.env"
if ! command -v node >/dev/null; then
  printf '%s\n' 'Reporting: Node.js is unavailable; use weekly-report after installing prerequisites.'
  exit 0
fi
exec node "$kit_root/scripts/weekly-report-status.mjs" "$TASKS_DIR" "$@"
