#!/usr/bin/env bash
set -euo pipefail

kit_root="$(cd "$(dirname "$0")/.." && pwd)"
candidate_root="$(mktemp -d /tmp/agent-workflow-kit-publication.XXXXXX)"
trap 'rm -rf "$candidate_root"' EXIT

candidate_tree="$(git -C "$kit_root" write-tree)"
git -C "$kit_root" archive --format=tar "$candidate_tree" | tar -xf - -C "$candidate_root"

unexpected_paths='^(tasks/|global-skills/|components\.tsv$|scripts/configure-reporting\.mjs$|templates/project/\.claude/(agents|hooks|scripts|skills)/|templates/project/\.codex/skills/|templates/project/\.workflow/PROJECT_RULES\.md$|templates/project/tasks/)'
if find "$candidate_root" -mindepth 1 -printf '%P\n' | rg "$unexpected_paths"; then
  printf '%s\n' 'Unexpected historical file in publication archive' >&2
  exit 1
fi

for required_path in README.md LICENSE THIRD_PARTY_NOTICES.md PUBLISHING.md \
  .github/workflows/ci.yml install.sh module.sh scripts/modules.mjs core modules \
  templates/project/.workflow/runtime tests; do
  [ -e "$candidate_root/$required_path" ] || {
    printf 'Required publication path missing from archive: %s\n' "$required_path" >&2
    exit 1
  }
done

(
  cd "$candidate_root"
  bash tests/run.sh
)

printf 'ok    publication archive passed: %s\n' "$candidate_tree"
