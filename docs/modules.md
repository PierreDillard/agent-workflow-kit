# Write and plug in a module

A module is a local directory containing `module.json` and its assets. Official modules and
external modules use the same manifest and installer. Node.js 18+ is required.

Start from [project-notes](../examples/modules/project-notes/module.json), a working external example:

```bash
./module.sh list --catalog examples/modules
./module.sh add --target /path/to/project --module examples/modules/project-notes --dry-run
./module.sh add --target /path/to/project --module examples/modules/project-notes \
  --set 'project-notes.title=My project notes'
```

`--catalog DIRECTORY` discovers child directories containing a manifest. Discovery does not select
or execute anything. `--module DIRECTORY` selects that module; `--modules id,id` selects catalog IDs.
Repeat either source option to supply more directories. Required dependencies are resolved from
installed modules and available catalogs and printed in the plan. No network download occurs.
Use `--profile minimal|continuity|complete` during initial installation; Complete has a fixed list
of eight official modules and never automatically activates external discoveries.

## Manifest version 1

```json
{
  "schemaVersion": 1,
  "id": "project-notes",
  "version": "1.0.0",
  "description": "A small notebook",
  "requires": { "memory": "1.0.0" },
  "config": { "title": "Project notes" },
  "skills": [{ "name": "project-notes", "source": "skills/project-notes" }],
  "files": [{ "source": "templates/notes.md", "target": "{{TASKS_DIR}}/notes/README.md", "editable": true }],
  "rules": [{ "id": "notes", "source": "rules/notes.md", "point": "task-validation", "when": ["tasks"] }],
  "checks": [{ "path": "{{TASKS_DIR}}/notes/README.md", "type": "file" }]
}
```

Unknown fields are rejected. IDs use lowercase letters, digits and single hyphens; `core` is reserved.
Versions use `major.minor.patch`. Dependencies accept an exact version or `*`; version ranges are
not implemented. Missing dependencies, cycles, duplicate IDs and incompatible versions fail before
writing any destination. One component/file has one owner; destination collisions are errors.

| Field | Contract |
|---|---|
| `skills` | `name`, `source` directory with matching SKILL.md frontmatter; optional boolean `global` |
| `files` | `source` file/directory, `target`, optional boolean `editable` (default false) |
| `rules` | Unique `id`, Markdown `source`, `point`, optional `when` array of module IDs |
| `hooks` | Unique `id`, module-owned managed `path`, `runner` (`bash` or `node`), `args`, `point`, optional `when` |
| `checks` | Owned `path`, `type` (`file`, `json`, `timezone`), optional positive `maxBytes` |
| `config` | String defaults; override on first activation with `--set module.key=value` |

Collections other than identity fields may be omitted. A source path is relative to its module.
Sources and targets reject traversal and symlinks. File destinations are restricted to TASKS_DIR,
`.claude/scripts/` and `.claude/agents/`. The kit owns skills, runtime, client settings and shared rules;
use the corresponding contributions instead of overwriting them through `files`.

Skills are always installed in project-local Claude and Codex directories, with identical contents.
`global: true` additionally exports both user-level mirrors if INSTALL_GLOBAL_SKILLS=true. Existing
identical user exports are retained; divergent exports refuse installation. Assets without template
markers preserve their bytes. Text templates support `{{TASKS_DIR}}`, `{{REPORT_TIMEZONE}}` and
`{{module-id.setting}}`. JSON values are expanded after parsing, so quotes in settings remain valid.

## Integration points

- `session-start`: instruction fragments and executable hooks.
- `task-validation`: instruction fragments applied by the workflow agent when validating work.
- `before-handoff`: instruction fragments applied before replacing a handoff.

Only session-start accepts executable hooks. Other points are instructions, not automatic shell
callbacks. A hook references a non-editable file declared by that same module; arguments are passed
without shell interpolation. Each hook has a ten-second timeout. Discovery, dry run, install and
doctor never execute module hooks. Hooks run at session start after activation, with a hash check.

`when` activates a contribution only when every listed module is installed; it does not install
those modules. Adding a companion later recomposes shared rules and activates matching hooks.
Dependencies run before dependents; unrelated modules use sorted IDs; contributions within a module
retain manifest order. Reporting's handoff fragment is a built-in example of conditional composition.

The doctor checks dependencies, managed hashes/modes, mirrored skills and declarative checks.
`file` checks presence, `json` additionally parses JSON, and `timezone` also validates its `timezone`
field. It checks no external services and makes no claim about the agent following instructions.

## Preservation and lifecycle

The installed `.workflow-kit.json` records modules, versions, selected IDs, settings, file owners and
hashes. `.workflow/components.tsv` and PROJECT_RULES.md are derived. Never hand-edit managed outputs.
`editable: true` marks initial user data: it must exist, but later edits do not block module additions.
The existing CLAUDE.md and AGENTS.md contents are preserved and receive only the workflow pointer.

Adding a module validates the current inventory and composes a complete plan before applying it.
A project lock prevents simultaneous kit writes. On a caught write failure, completed writes and newly
created directories roll back. A process kill or power loss is not covered by this in-process rollback;
inspect a leftover `.workflow-install.lock` before retrying. Dry run leaves the target untouched.

Repeating the same module/version/content/settings with add is a no-op, preserving edited user data.
Different content under the same ID requires the explicit update command below. Removal, remote
registries and automatic migration from the old monolithic inventory are not implemented.
Changing the user-export destination is not a migration: existing exports must already be present
at the explicitly selected or WORKFLOW_USER_ROOT-overridden destination.

## Validate a module

Use an isolated Git checkout and a temporary `--user-root`, run installation or add with `--dry-run`,
then activate and run `.claude/scripts/workflow-doctor.sh`. Check that user data remains unchanged,
repeating activation is a no-op, and conditional contributions appear only with their companions.
Run `bash tests/run.sh` for the kit's integration, rollback and reporting tests.

## Update an installed kit

Run the command from the source checkout you intend to deliver, using its runtime rather than
an older runtime installed in the target. No source is downloaded or substituted automatically.

```bash
bash module.sh update --target /path/to/project --dry-run
# Inspect the differences and copy the exact fingerprint printed as "Plan: ...".
bash module.sh update --target /path/to/project --expect-plan PLAN_FINGERPRINT
```

Optionally supply `--revision FULL_SHA` on both commands to require that exact checked-out HEAD.
A branch name, shortened SHA or a different commit is refused. The source identity contains the
full HEAD SHA, working-tree dirty state and a SHA-256 fingerprint of the delivered package inputs,
including selected external module assets. Dirty checkout content is identified by that fingerprint;
HEAD alone is never presented as the delivered revision. External installed modules require their
source with `--module PATH` or `--catalog DIRECTORY`; discovery does not add them to the selection.

The preview shows source identity, installed module versions, preserved files, content differences
and file hashes. Binary changes show hashes. A conflict exits unsuccessfully with its path/cause
before any target mutation. Text diffs are a contiguous replacement block, not a minimal edit script.
Applying requires the exact preview fingerprint; any relevant source, inventory, managed file or
editable-file change makes the plan stale. Re-preview after a change. The source and target are
checked again under the project lock before writes; destination bytes and mode are also checked
immediately before replacement.

Update preserves selected module IDs, settings, configuration, project/user export destinations,
AGENTS.md/CLAUDE.md content, branch policy and all existing editable files. Unmanaged tasks, memories,
handoffs and local policies are not touched. Core files, module-managed non-editable files, both skill
mirrors, composed rules/components and inventory are updated through the existing transaction.
New editable template files may be created when unoccupied; existing user data is never reset.
Adding a required module, removing a managed file, changing ownership/editability/settings or
relocating exports requires an explicit migration and is refused. Numeric version downgrades and
ambiguous version transitions are refused. An installed known source SHA must be available and an
ancestor of the candidate SHA; otherwise the update is refused.

Old schema-1 inventories without source provenance are supported: existing hashes/modes still have
to match, but history and upgrade direction are reported as unknown. Acceptance of their exact plan
records the delivered source without inventing an old revision. This does not establish compatibility
with every historical installation; extra managed files requiring removal are refused as migrations.

Changed managed files or divergent global exports are conflicts, not files to overwrite forcibly.
After update, run `.claude/scripts/workflow-doctor.sh` and the project's relevant checks. The doctor
verifies installation integrity; it does not prove native-agent routing or application behavior.
Repeating an unchanged update preserves all bytes. Caught write errors roll back the transaction;
power loss/process kill is not covered. Inspect a leftover `.workflow-install.lock` and the target
inventory/files before retrying after such an interruption. No Git operation, hook, application task
or external publication is performed by update.
