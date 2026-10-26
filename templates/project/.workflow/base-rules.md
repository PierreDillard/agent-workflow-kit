# Portable workflow rules

Read `{{KIT_DIR}}/kit.env` and the installed modules below. Apply only their contributions.
Discovering an available module or user-global skill never activates its project behavior.
Use `branch-router` for branch policy and `project-workflow` for non-trivial requests.
Load the smallest relevant context. Record only checks actually run and their limits.
Mandatory writing pattern: every document written under `{{TASKS_DIR}}` is an ultra-short
index per theme routing to annex files, or an annex holding the content of a single theme.
Use `doc-pattern` before creating, growing or splitting such a file; it has no opt-out, and
content in an index, or an unlinked annex, is a defect to repair in the same action.
Never create branches, commit, push, merge or mutate external systems without user authorization.
Module-owned skills live under `.claude/skills/`; `.codex/skills/` contains generated mirrors.
Module manifests own behavior; `{{KIT_DIR}}/kit.json` records the installed selection and ownership.
