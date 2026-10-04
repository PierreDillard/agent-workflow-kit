#!/usr/bin/env bash
set -euo pipefail
kit_root="$(cd "$(dirname "$0")/.." && pwd)"
fixture_root="$(mktemp -d)"
trap 'rm -rf "$fixture_root"' EXIT
project_path="$fixture_root/project with spaces"
user_path="$fixture_root/user with spaces"
mkdir -p "$project_path" "$user_path"
git init -q --separate-git-dir "$fixture_root/git metadata" "$project_path"
[ -f "$project_path/.git" ]
config_path="$fixture_root/config.env"
printf '%s\n' 'PROJECT_NAME=Portable example' 'TASKS_DIR=planning notes/tasks' \
  'INSTALL_GLOBAL_SKILLS=false' 'REPORT_TIMEZONE=America/Montreal' > "$config_path"

# Regression: template task authorities must follow the configured task directory.
bash "$kit_root/install.sh" --target "$project_path" --profile complete --non-interactive \
  --config "$config_path" --user-root "$user_path" > "$fixture_root/install.log" 2>&1 || {
    cat "$fixture_root/install.log"; exit 1;
  }
[ -f "$project_path/planning notes/tasks/PROJECT_MEMORY.md" ]
[ ! -e "$project_path/tasks" ]
[ -f "$project_path/planning notes/tasks/reports/config.json" ]

# Both hooks must resolve paths from a relocated checkout, even with spaces.
relocated_path="$fixture_root/other workstation/project renamed"
mkdir -p "$(dirname "$relocated_path")"
mv "$project_path" "$relocated_path"
project_path="$relocated_path"
node --input-type=module - "$project_path" <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const root = process.argv[2];
const tasks = 'planning notes/tasks';
const statusModule = await import(pathToFileURL(join(root, '.claude/scripts/weekly-report-status.mjs')));
const configPath = join(root, tasks, 'reports/config.json');
const config = JSON.parse(readFileSync(configPath));
assert.equal(config.timezone, 'America/Montreal');
const day = statusModule.localDay(new Date(), config.timezone);
const week = statusModule.isoWeek(day);
assert.deepEqual(config.sources, [{ name: 'project', path: '.', path_env: 'WEEKLY_REPORT_PROJECT_ROOT' }]);
assert.equal(config.objectives, `${tasks}/reports/objectives.md`);
const state = { week, goals_status: 'approved', snoozed_until: null, absence: false, skip_report: false };
const notebook = `<!-- weekly-report\n${JSON.stringify(state)}\n-->\nValidation: pending\nVisibilité: internal\nPrivate note\n`;
const notebookPath = join(root, tasks, `reports/${week}.carnet.md`);
writeFileSync(notebookPath, notebook);
for (const filename of ['.claude/settings.json', '.codex/hooks.json']) {
  const hooks = JSON.parse(readFileSync(join(root, filename)));
  const command = hooks.hooks.SessionStart[0].hooks[0].command;
  const environment = { ...process.env, CLAUDE_PROJECT_DIR: root };
  if (filename.startsWith('.codex')) delete environment.CLAUDE_PROJECT_DIR;
  const output = execFileSync('bash', ['-c', command], { cwd: root, env: environment, encoding: 'utf8' });
  assert.ok(output.includes('notes à valider'), filename);
  assert.ok(!output.includes('Private note'), filename);
}
assert.equal(readFileSync(notebookPath, 'utf8'), notebook);
assert.equal(JSON.parse(execFileSync('bash', [join(root, '.claude/scripts/weekly-report-status.sh')],
  { cwd: '/', encoding: 'utf8' })).week, week);
NODE
WORKFLOW_PROJECT_ROOT="$project_path" bash "$project_path/.claude/scripts/workflow-doctor.sh"
WORKFLOW_USER_ROOT="$fixture_root/new user" bash -c '. "$1/.workflow-kit.env"; [ "$WORKFLOW_USER_ROOT" = "$2" ]' \
  bash "$project_path" "$fixture_root/new user"
env -u WORKFLOW_USER_ROOT bash -c '. "$1/.workflow-kit.env"; [ "$WORKFLOW_USER_ROOT" = "$2" ]' \
  bash "$project_path" "$user_path"

# Existing destination hooks must survive refusal, including dry-run mode.
collision_path="$fixture_root/existing workflow"
mkdir -p "$collision_path/.codex"
git -C "$collision_path" init -q
printf '%s\n' '{"hooks":{"SessionStart":[]},"local":"preserve"}' > "$collision_path/.codex/hooks.json"
cp "$collision_path/.codex/hooks.json" "$fixture_root/original-hooks.json"
for mode in --dry-run ''; do
  if bash "$kit_root/install.sh" --target "$collision_path" --profile complete --non-interactive \
    --config "$config_path" --user-root "$user_path" $mode > "$fixture_root/collision.log" 2>&1; then
    printf '%s\n' 'FAIL: existing Codex hooks were not rejected' >&2; exit 1
  fi
  grep -q 'Collision:' "$fixture_root/collision.log"
  cmp "$collision_path/.codex/hooks.json" "$fixture_root/original-hooks.json"
  [ ! -e "$collision_path/.workflow-kit.json" ]
  [ ! -e "$collision_path/.claude" ]
done
printf '%s\n' 'ok    reporting: custom task root, relocation, spaces, both hooks, read-only'
