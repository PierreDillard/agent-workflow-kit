#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/../.." && pwd)"
while IFS=$'\t' read -r component_name component_class component_dependencies component_purpose; do
  [ "$component_class" = 'project-template' ] || continue
  mkdir -p "$project_root/.codex/skills/$component_name"
  rsync -a --delete "$project_root/.claude/skills/$component_name/" "$project_root/.codex/skills/$component_name/"
done < "$project_root/.workflow/components.tsv"
printf '%s\n' 'Managed Codex skill mirrors synchronized; unmanaged skills preserved.'
