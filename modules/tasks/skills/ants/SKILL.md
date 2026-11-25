---
name: ants
description: Structure implementation as small, atomic, traceable changes with one owner, one observable signal and an updated task record. Use when planning, implementing, reviewing or refactoring code, especially to avoid big patches, unrelated refactors, duplicated state or unclear ownership.
---

# ANTS

Every implementation change must be easy to understand, verify, review and reverse.

## Before changing code

For every development task start or resume under the flat branch strategy, run the
shared branch check from the project root before creating or editing the task, changing
its status, updating the index, or touching implementation files:

```sh
sh "./{{KIT_DIR}}/scripts/git-hooks/pre-commit" task-start <task-slug> <feature-branch-prefix>
```

Substitute the effort slug and the prefix configured in the project's kit.env. Omit the
prefix argument if no prefix is configured. The check blocks `main` and `master`. On a
nonzero exit, stop before writing and report the diagnostic. Continue only from an allowed
branch after rerunning the check.
Read-only planning and trunk/custom routing follow the project's branch policy.

Identify:

```text
Objective:
Selected task:
Atomic step:
Owner:
Source of truth:
Non-goals:
Risk:
Observable signal:
```

If the installed project provides `write-task`, create or select the branch task before the first
edit. A change without a task is acceptable only for a read-only answer or a genuinely trivial,
isolated correction; state why.

## Atomic loop

1. Select one task and one unfinished step.
2. Make only the smallest change needed for that step.
3. Observe its signal; never record an unrun check as evidence.
4. Update the task Validation and status.
5. Continue with the next step only after the current one is green or explicitly blocked.

One task has one goal. One module has one responsibility. One behavior has one obvious owner.
Avoid unrelated refactors, duplicate state, hidden coupling and unclear cleanup.

## Trace

Every meaningful modification must remain findable through its branch task, affected files,
validation evidence and proposed commit trace. The trace never authorizes a commit.

Before closure, use a quality gate only when Quality is installed, and confirm that the next likely change is easier,
not harder.
