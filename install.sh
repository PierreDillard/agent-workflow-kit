#!/usr/bin/env bash
set -euo pipefail

kit_root="$(cd "$(dirname "$0")" && pwd)"
target_path=''
config_path=''
non_interactive='false'
dry_run='false'
module_arguments=()
workflow_user_root="${CODEX_WORKFLOW_USER_ROOT:-$HOME}"

usage() {
  printf '%s\n' 'Usage: install.sh --target PATH [--dry-run] [--non-interactive --config FILE] [--user-root PATH] [--profile minimal|continuity|complete] [--modules IDS] [--module PATH]'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target) target_path="${2:-}"; shift 2 ;;
    --config) config_path="${2:-}"; shift 2 ;;
    --non-interactive) non_interactive='true'; shift ;;
    --dry-run) dry_run='true'; shift ;;
    --user-root) workflow_user_root="${2:-}"; shift 2 ;;
    --profile|--modules|--module|--catalog|--set) module_arguments+=("$1" "${2:-}"); shift 2 ;;
    --help) usage; exit 0 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

[ -n "$target_path" ] || { usage >&2; exit 2; }
[ -d "$target_path" ] || { printf 'Target directory does not exist: %s\n' "$target_path" >&2; exit 1; }
target_path="$(cd "$target_path" && pwd)"
[ "$(git -C "$target_path" rev-parse --show-toplevel 2>/dev/null)" = "$target_path" ] \
  || { printf 'Target must be a Git repository root: %s\n' "$target_path" >&2; exit 1; }
[ ! -e "$target_path/.workflow-kit.json" ] || { printf 'Workflow kit already installed\n' >&2; exit 1; }
for required_tool in node rsync awk sed sort tac find; do
  command -v "$required_tool" >/dev/null || { printf 'Missing prerequisite: %s\n' "$required_tool" >&2; exit 1; }
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 18) process.exit(1)' \
  || { printf 'Node.js 18 or newer required\n' >&2; exit 1; }

PROJECT_NAME=''
DEFAULT_BRANCH='main'
BRANCH_STRATEGY='flat'
FEATURE_BRANCH_PREFIX='dev/'
BRANCH_POLICY_FILE=''
TASKS_DIR='tasks'
DEV_COMMAND=''
BUILD_COMMAND=''
TEST_COMMAND=''
LINT_COMMAND=''
TYPECHECK_COMMAND=''
REQUIRE_PRECOMMIT='false'
INSTALL_GLOBAL_SKILLS='true'
REPORT_TIMEZONE='Europe/Paris'

load_config() {
  local input_path="$1"
  local config_key config_value
  [ -f "$input_path" ] || { printf 'Config not found: %s\n' "$input_path" >&2; exit 1; }
  while IFS='=' read -r config_key config_value || [ -n "$config_key" ]; do
    case "$config_key" in
      ''|'#'*) continue ;;
      PROJECT_NAME|DEFAULT_BRANCH|BRANCH_STRATEGY|FEATURE_BRANCH_PREFIX|BRANCH_POLICY_FILE|TASKS_DIR|DEV_COMMAND|BUILD_COMMAND|TEST_COMMAND|LINT_COMMAND|TYPECHECK_COMMAND|REQUIRE_PRECOMMIT|INSTALL_GLOBAL_SKILLS|REPORT_TIMEZONE)
        printf -v "$config_key" '%s' "$config_value"
        ;;
      *) printf 'Unknown config key: %s\n' "$config_key" >&2; exit 1 ;;
    esac
  done < "$input_path"
}

[ -z "$config_path" ] || load_config "$config_path"

if [ "$non_interactive" != 'true' ]; then
  read -r -p "Project name [$(basename "$target_path")]: " interactive_value
  PROJECT_NAME="${interactive_value:-$(basename "$target_path")}"
  read -r -p "Default branch [$DEFAULT_BRANCH]: " interactive_value
  DEFAULT_BRANCH="${interactive_value:-$DEFAULT_BRANCH}"
  read -r -p "Branch strategy flat|trunk|custom [$BRANCH_STRATEGY]: " interactive_value
  BRANCH_STRATEGY="${interactive_value:-$BRANCH_STRATEGY}"
else
  [ -n "$config_path" ] || { printf 'Non-interactive mode requires --config\n' >&2; exit 1; }
fi

[ -n "$PROJECT_NAME" ] || PROJECT_NAME="$(basename "$target_path")"
case "$BRANCH_STRATEGY" in flat|trunk|custom) ;; *) printf 'Invalid BRANCH_STRATEGY\n' >&2; exit 1 ;; esac
case "$REQUIRE_PRECOMMIT" in true|false) ;; *) printf 'Invalid REQUIRE_PRECOMMIT\n' >&2; exit 1 ;; esac
case "$INSTALL_GLOBAL_SKILLS" in true|false) ;; *) printf 'Invalid INSTALL_GLOBAL_SKILLS\n' >&2; exit 1 ;; esac
case "$TASKS_DIR" in /*|*'..'*|'') printf 'TASKS_DIR must be a safe relative path\n' >&2; exit 1 ;; esac
case "$TASKS_DIR" in .|./*|.git|.git/*|.claude|.claude/*|.codex|.codex/*|.workflow|.workflow/*)
  printf 'TASKS_DIR cannot overlap workflow or repository metadata\n' >&2; exit 1 ;;
esac
if [ "$BRANCH_STRATEGY" = 'custom' ]; then
  [ -f "$BRANCH_POLICY_FILE" ] || { printf 'Custom strategy requires BRANCH_POLICY_FILE\n' >&2; exit 1; }
fi

export PROJECT_NAME DEFAULT_BRANCH BRANCH_STRATEGY FEATURE_BRANCH_PREFIX BRANCH_POLICY_FILE TASKS_DIR
export DEV_COMMAND BUILD_COMMAND TEST_COMMAND LINT_COMMAND TYPECHECK_COMMAND REQUIRE_PRECOMMIT
export INSTALL_GLOBAL_SKILLS REPORT_TIMEZONE
[ "$dry_run" = 'false' ] || module_arguments+=(--dry-run)
exec node "$kit_root/scripts/modules.mjs" install --target "$target_path" --user-root "$workflow_user_root" "${module_arguments[@]}"
