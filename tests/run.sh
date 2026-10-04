#!/usr/bin/env bash
set -euo pipefail
kit_root="$(cd "$(dirname "$0")/.." && pwd)"
bash -n "$kit_root/install.sh" "$kit_root/module.sh" "$kit_root/core/scripts/"*.sh "$kit_root/core/hooks/"*.sh
node --test "$kit_root/tests/modules.test.mjs"
node "$kit_root/tests/weekly-report-status.test.mjs"
bash "$kit_root/tests/reporting-portability.sh"
printf '\nAll workflow-kit tests passed.\n'
