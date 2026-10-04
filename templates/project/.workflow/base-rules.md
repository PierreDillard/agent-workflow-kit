# Portable workflow rules

Read `.workflow-kit.env` and the installed modules below. Apply only their contributions.
Discovering an available module or user-global skill never activates its project behavior.
Use `branch-router` for branch policy and `project-workflow` for non-trivial requests.
Load the smallest relevant context. Record only checks actually run and their limits.
Never create branches, commit, push, merge or mutate external systems without user authorization.
Module-owned skills live under `.claude/skills/`; `.codex/skills/` contains generated mirrors.
Module manifests own behavior; `.workflow-kit.json` records the installed selection and ownership.
