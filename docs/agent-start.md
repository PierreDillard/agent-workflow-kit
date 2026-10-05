# Start from a project as a coding agent

Use this entry when the user asks you to retrieve the kit and adapt it to their project.
The acquisition and dry-run below use the existing installer; automated skill selection,
approval enforcement and native-agent behavior are still being implemented.
The [customization contract](agent-customization.md) owns the agreed permissions.

## Inspect before preparing an installation

Read the project's instructions and identify its Git root. Do not infer permissions from skills
available globally. If .workflow-kit.json already exists, inspect that installation and use the
[module addition guide](modules.md); do not reinstall the kit or migrate its files automatically.

Requirements: Linux, Git, Bash, Node.js 18+, rsync and the GNU utilities checked by install.sh.
This entry does not install prerequisites or change system configuration.
Select a full commit SHA from the authorized repository. The SHA below is the revision verified
during bootstrap development, not an instruction to follow latest or a released version.

## Retrieve an exact revision and prepare a dry-run

Replace the two /path placeholders. Use a new workspace outside the project and user skill
directories. Run this block in one Bash shell; it stops at the first failure.
It writes the clone, configuration, provenance and log only in that workspace.

```bash
set -euo pipefail
project_directory='/path/to/my-project'
bootstrap_directory='/path/to/new-bootstrap-workspace'
kit_origin='https://github.com/PierreDillard/agent-workflow-kit.git'
kit_revision='10a27d691c46a4db36f4c70dea18101aab91bb36'
test ! -e "$bootstrap_directory"
test "$(git -C "$project_directory" rev-parse --show-toplevel)" = "$project_directory"
mkdir -p "$bootstrap_directory/user-root"
git clone --no-checkout "$kit_origin" "$bootstrap_directory/kit"
git -C "$bootstrap_directory/kit" checkout --detach "$kit_revision"
test "$(git -C "$bootstrap_directory/kit" rev-parse HEAD)" = "$kit_revision"
test "$(git -C "$bootstrap_directory/kit" remote get-url origin)" = "$kit_origin"
printf 'origin=%s\nrevision=%s\n' "$kit_origin" "$kit_revision" \
  > "$bootstrap_directory/provenance.txt"
cat > "$bootstrap_directory/project.env" <<'CONFIG'
PROJECT_NAME=Agent bootstrap
TASKS_DIR=tasks
INSTALL_GLOBAL_SKILLS=false
CONFIG
bash "$bootstrap_directory/kit/install.sh" \
  --target "$project_directory" \
  --user-root "$bootstrap_directory/user-root" \
  --non-interactive --config "$bootstrap_directory/project.env" \
  --dry-run > "$bootstrap_directory/dry-run.log" 2>&1
cat "$bootstrap_directory/dry-run.log"
```

Inspect the exact revision's README, install.sh and relevant runtime sources before invoking
its installer. Split the block before the installer command to perform that inspection.
An identified commit fixes the input; its hash alone does not establish trust in its origin.

The default dry-run proposes Tasks + Memory. It may display CREATE and UPDATE entries,
but must finish with DRY RUN: no target files were written.
Project files and user skill directories must remain unchanged.
The temporary user-root and INSTALL_GLOBAL_SKILLS=false prevent this preparation from exporting
skills into the user's global directories. Keep that configuration for subsequent isolated checks.

Do not remove --dry-run as part of bootstrap. First produce the project diagnostic, justify the
selection and inspect the complete plan. Use `module.sh select --skills name,name` for a read-only
official module proposal as described in the [module guide](modules.md). This does not infer needs
automatically or enforce approval. Skills from the repo catalog can be installed autonomously;
external or created skills require approval of the exact package and target.
For an unmet need, prefer a minimal locally authored skill through write-a-skill. Consider an
external source only when local authoring cannot reasonably cover that need, and explain why.
Do not import packages just to complete an external-intake test. Locally authored content still
requires inspection and exact-package agreement before installation or use.
Any proposed rule or workflow-step change also requires approval, including rules bundled with
official modules. The [module guide](modules.md) describes the existing installation commands.

## Failure handling

| Failure | Required response |
|---|---|
| Repository unavailable or network failure | Stop before running the installer; report the command, cause and incomplete retrieval |
| Requested revision missing | Stop; never substitute a branch tip, latest or another revision |
| Git root invalid or kit already installed | Stop initial installation; inspect the target and use the existing addition flow if applicable |
| Missing prerequisite | Report the missing tool; do not install it or continue with a partial installation |
| Installer or dry-run failure | Inspect the log, preserve the target and report the failure; no activation |

A failed clone can leave an incomplete workspace. Do not silently reuse or overwrite it.
Keep the evidence and choose a fresh workspace for a retry.

If the network is unavailable, an existing authorized local checkout can be used after verifying
its origin and exact HEAD with git remote get-url origin and git rev-parse HEAD.
Run the same dry-run with a separate config and temporary user-root.
Mark acquisition as local-only: this is not evidence of successful network retrieval.
If that revision is not locally available, leave bootstrap incomplete.

## Validation boundaries

Verified during development on Linux: real GitHub retrieval of the SHA above, successful dry-run,
unchanged isolated project and user-root, and failure cases recorded with their actual results.
Failure checks covered an unavailable GitHub repository, a missing revision and a missing Node tool.
A full network outage and the local-only fallback were not exercised.
The entry itself is an uncommitted local change until publication is separately authorized.
A clone of the current published revision does not contain this new entry yet.

This procedure proves acquisition and preparation only. Installation, skill discovery, usage and
respect of approvals in Claude Code, Codex and Copilot require their own observations.
The doctor checks installed files; it does not demonstrate that an agent follows the workflow.
