---
name: ants
description: Structure implementation as small, atomic, traceable changes with one owner, one observable signal and an updated task record. Use when planning, implementing, reviewing or refactoring code, especially to avoid big patches, unrelated refactors, duplicated state or unclear ownership.
---

# ANTS

Every implementation change must be easy to understand, verify, review and reverse.

## Before changing code

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
5. Continue with the next step only after the current one is green or explicitly blocked; an
   investigation that stops producing information follows Bounded investigation below.

## Bounded investigation

Progress is new information: a discriminating observation, a hypothesis confirmed or refuted by
evidence, or a failure reproduced or narrowed. Replaying an attempt without a changed hypothesis,
probe, input or observation level is repetition, not progress, even when it takes new commands.

When a step investigates an unknown, state its budget of attempts without progress with the step,
sized to its risk and the cost of its signal (typically two or three). Progress resets the
budget; conversation length never consumes it. Extend it only by naming the expected new evidence.

When the budget is spent, change strategy once: another hypothesis, a more discriminating probe, a
smaller real slice or a different observation level. If no in-scope strategy remains, stop with
one explicit cause:

- `technical blocker`: a missing runtime, tool, access or environment. Record what would unblock
  it, mark the step `blocked` with that reason and continue only independent steps.
- `user decision required`: the next action depends on scope, a trade-off or an authorization not
  already given. State the decision and options; wait only on the actions that depend on it.
- `strategies exhausted`: no discriminating experiment remains in scope. Report the remaining
  unknown and what would resolve it.

The budget grants no authorization and is not a checkpoint: a satisfied signal proceeds without
confirmation, and stopping never widens scope or permissions.

Record each attempt in the task Validation, or in the response without a task: hypothesis,
outcome (`confirmed`, `refuted`, `inconclusive`), evidence reference, then the stop cause and next
action. Refuted hypotheses are not retried without new evidence. When Continuity is installed,
`project-handoff` links this record; never copy it into another status.

One task has one goal. One module has one responsibility. One behavior has one obvious owner.
Avoid unrelated refactors, duplicate state, hidden coupling and unclear cleanup.

## Trace

Every meaningful modification must remain findable through its branch task, affected files,
validation evidence and proposed commit trace. The trace never authorizes a commit.

Before closure, use a quality gate only when Quality is installed, and confirm that the next likely change is easier,
not harder.
