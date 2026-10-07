---
name: write-task
description: Create or restructure ANTS task files at the resolved effort location with atomic steps, observable signals and an explicit trace.
---

# Write Task

Use `branch-router` to identify the target implementation branch when known. Resolve the task
location using [Task placement](../../../.workflow/PROJECT_RULES.md#task-placement).

Create `README.md` as a derived navigation index before the first task. Read only the index and
the selected task, never every task body.

## Conditional design input

Consume design gates selected by `project-workflow` before drafting. Only when Quality is installed and `soak-readiness` applies,
insert its compact output after Non-goals under `## Soak contract`, then carry its overflow proof
into at least one ANTS Signal and one acceptance criterion. Do not duplicate or reinterpret its
checklist. Omit the entire section when the gate does not apply.

## Conditional integration proof

When `project-workflow` selects an integration proof, make the first implementation step the smallest
real path exercising the uncertain boundary. Use the existing ANTS fields, with no mandatory
extra section for unrelated tasks:

```md
### E1 — Prove the minimal path
- Assumption: {what could invalidate the solution}
- Real slice: {input → necessary boundaries → observable result}

**Signal** : {verification method and expected result}
```

Make dependent steps conditional on this Signal. Keep deferred work in `Non-goals` and record
actual evidence and its limits in `Validation`, never a predicted success. Execution and expansion
follow [project-workflow](../project-workflow/SKILL.md#integration-proof-before-expansion).

## Task contract

File name: `{NN}-{kebab-slug}.md`.

```md
---
objective: One verifiable outcome
status: pending | in-progress | implemented | reviewed | blocked
risk: low | medium | high
branch: target implementation branch when known, otherwise —
validator: Observable completion proof
---

# NN — Title

**Depends on**: NN | —
**Blocks**: NN | —

## Why
{For a feature, state the independently verifiable behavior that becomes usable.}
## Non-goals
{Only when Quality is installed and `soak-readiness` applies, insert its `## Soak contract` block here.}
## ANTS steps
### E1 — One atomic action
**Signal**: one observable proof
{Repeat this step shape, including Signal, for every remaining step.}
## Acceptance criteria
## Validation
{Checks actually run and results; independent review verdict + exact SHA if present, otherwise
not reviewed; commit evidence separately when known, otherwise uncommitted or unknown.}
## Files
## Constraints
**Trace**: `type(scope): imperative sentence`
```

## Step progression

Observe and briefly report each step’s technical Signal before proceeding to the next step or
task. Proceed when the Signal is satisfied, without requiring the user to restate the change or
validate their understanding. Preserve tests, review and other required approvals.

For feature work, group ANTS steps around one independently verifiable user behavior. Identify
infrastructure prerequisites explicitly; do not split a coherent behavior into UI-only,
service-only and server-only tickets. Example: selecting a supported stream displays that exact
stream’s preview; stopping it releases its subscription. File count is not an architecture metric.
Preserve all applicable protocol, resource lifecycle and soak-readiness gates.

Each step owns one change and one signal. Split a task that needs more than four steps. A signal is
evidence, not a promise to add a test; use an existing proof when it verifies the behavior.

## Signal quality

Choose evidence that exercises the claimed invariant: a focused test for deterministic logic,
or real integration/runtime and observable output when the boundary requires it. Running the full
application is valid when necessary; grep/typecheck alone cannot prove integration behavior.

A mock of the uncertain boundary is not proof of that boundary. When an invariant depends on an
external service or runtime behavior, require a real check, automated or performed by the user.
Tests of pure deterministic logic remain valid for their own invariant.

## Status and evidence

Task frontmatter `status` is authoritative; README is a derived navigation index. On starting,
set frontmatter to `in-progress`, then reflect it in the index. Before completing implementation
or writing a handoff, reconcile acceptance checks and actual Validation, then frontmatter, then
the derived index. Use exact status values in new index rows; annotate legacy completion icons
as `implemented` or `reviewed`. Never leave a proven implementation `pending`.

`implemented` means all agreed steps and signals are complete, with actual validation recorded.
`reviewed` is unavailable without Quality; it requires `review-gate` approval for the exact source SHA, regardless of risk; a later
source change invalidates approval and returns status to `implemented`. `done-check` alone leaves
status `implemented`. A commit is separate evidence, not a status or proof of review.
Record the reason for `blocked`. Missing files or contradictory evidence must be reported, never
filled with invented completion. Status-only updates are direct edits, not task restructuring.
Never delete an indexed task: mark it cancelled with the reason.

The Trace is a proposed commit message, not authorization to commit. Keep it aligned with the work
actually performed.
