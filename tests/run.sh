#!/usr/bin/env bash
set -euo pipefail
kit_root="$(cd "$(dirname "$0")/.." && pwd)"
bash -n "$kit_root/install.sh" "$kit_root/module.sh" "$kit_root/core/scripts/"*.sh "$kit_root/core/hooks/"*.sh
node --test "$kit_root/tests/modules.test.mjs" "$kit_root/tests/skill-proposals.test.mjs" "$kit_root/tests/skill-proposal-states.test.mjs" "$kit_root/tests/skill-proposal-resume.test.mjs" "$kit_root/tests/skill-proposal-recovery.test.mjs" "$kit_root/tests/external-skill-proposals.test.mjs"
node "$kit_root/tests/weekly-report-status.test.mjs"
bash "$kit_root/tests/reporting-portability.sh"
printf '\nAll workflow-kit tests passed.\n'
