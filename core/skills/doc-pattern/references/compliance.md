# Compliance: scope, exemptions, verification, repair

## In scope

Every document an agent creates or edits under `{{TASKS_DIR}}`:

- tasks and effort indexes, bug ledger and traces, memory themes, decision themes,
  domain docs and application flows, handoffs and context relays, learning records,
  reports kept in the repository,
- any new family an agent introduces there,
- any skill an agent authors for the project: short `SKILL.md`, detail in `references/`.

## Exempt

- Source code, configuration, tests, and anything outside `{{TASKS_DIR}}`.
- Commit messages, review and pull-request text, chat answers.
- `CLAUDE.md` / `AGENTS.md`: they carry the kit pointer only, and never a copy of an index.
- Documents produced for people outside the repository (a shareable weekly report is the
  deliverable itself, not a workflow document); its internal notebook stays in scope.
- Files the kit owns and manages. An agent does not edit them.

Exemption covers the file, never the habit: an exempt document that grows into reference
material is moved under `{{TASKS_DIR}}` as an index plus annexes.

## What is verified automatically

`{{KIT_DIR}}/scripts/workflow-doctor.sh` warns, per module checks:

| Signal | Meaning |
|---|---|
| `Size limit exceeded: <path>` | An index passed 8 KiB or an annex passed 16 KiB. Split it. |
| `Broken link in <index>: <target>` | A row points at a missing annex. Create it or drop the row. |
| `Index row without annex link in <index>: line N` | A table row carries content instead of routing. Move the content into an annex and leave a link. |

The doctor proves file shape, not judgment: it cannot see a row that summarizes its annex, an
annex that duplicates its index, or a theme split by date instead of responsibility. Those stay
the writer's obligation and a reviewer's check.

## Repairing a violation

1. Move every piece of content out of the index into the owning annex.
2. Leave one row per annex, with a link that resolves.
3. Split anything over budget, per `writing.md`.
4. Re-run the doctor and report the warnings that remain, with their limits.

A violation found in an existing file is repaired in the family being touched, not across the
whole directory in one unrequested sweep.
