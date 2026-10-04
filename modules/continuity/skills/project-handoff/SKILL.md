---
name: project-handoff
description: Create or update the current branch handoff so another session can resume from its task, memory and verified state.
---

# Project Handoff

Resolve the current branch with `branch-router`. Replace slashes with dashes and write one file:
`${TASKS_DIR}/handoff/<safe-branch>.md`. Update a recent file in place; do not create topic-specific
handoffs.

Before writing, follow `write-task` status and evidence rules: reconcile the active task’s
acceptance checks, Validation and authoritative frontmatter, then its derived README row. If
files or evidence are missing, state the gap instead of claiming synchronization succeeded.

Before replacing the previous handoff, apply the active before-handoff contributions in
`.workflow/PROJECT_RULES.md`. With none installed, continue directly.

Include date, branch and status, followed by: next focus, verified current state, implementation
decisions, Git state, relevant files, risks, immediate atomic actions and suggested skills.

Distinguish implementation (task status + validation), independent review (verdict + exact SHA,
or not evidenced), and commit (SHA, or uncommitted/unknown). None implies either of the others.
Link to the authoritative task at its existing path, branch memory and project memory rather
than maintaining another task status or duplicating their content. Keep the
handoff under 120 lines, mark uncertainty, and redact secrets or personal data.
