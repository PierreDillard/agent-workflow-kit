---
name: wayfinder
description: Map a multi-session initiative into decision tickets, resolving one frontier ticket at a time before implementation tasks begin.
disable-model-invocation: true
---

# Wayfinder

Use for an initiative too uncertain or large for one `write-task` task. Wayfinder plans the route;
it does not implement production changes. When the route becomes clear, hand the result to
`write-task`.

Resolve the directory using [Task placement](../../../.workflow/PROJECT_RULES.md#task-placement).
The map is its `README.md`, marked on the first line with `<!-- wayfinder:map -->`. It records a
one- or two-line destination, standing notes, an indexed ticket frontier, dependency order, fog not
yet specifiable and explicit out-of-scope work.

```md
<!-- wayfinder:map -->
# <Effort name> — wayfinder map

## Destination
<What reaching the end makes decidable or implementable.>

## Notes
<Standing preferences, relevant skills and constraints.>

## Index
| # | File | Title | Type | Status |
|---|------|-------|------|--------|
| 00 | [00-question.md](00-question.md) | Title | research | pending |

## Dependency order
<00 → {01, 02} → 03>

## Not yet specified
<In-scope questions that cannot yet be phrased sharply.>

## Out of scope
<Work beyond the destination, with a short reason and link when known.>
```

Each sibling ticket uses `write-task` frontmatter and status rules, plus `**Wayfinder**: research
| prototype | grilling | task`, a single `## Question`, `## Resolution` and `## Validation`.
Refer to a ticket by its title, not a bare number. Claim it by setting status to `in-progress` and
updating the derived index. Record the answer and actual evidence before status becomes
`implemented`; the frontier contains only unblocked `pending` tickets.

Ticket types are deliberately bounded:

- `research` is agent-led investigation of project sources or supplied documentation.
- `prototype` is a cheap, disposable artifact for user feedback, kept outside production code.
- `grilling` invokes `grill-me` for intent or preference questions.
- `task` is a prerequisite action rather than a decision; provide a precise user checklist when it
  cannot be completed autonomously.

Do not answer a user-preference question in an agent-only research pass. Resolve one unblocked
frontier ticket at a time. A question belongs in `Not yet specified` while it cannot be stated
sharply; when a resolution makes it precise, add a ticket and remove it from the fog. If a ticket
falls beyond the destination, close it into `Out of scope` instead of resolving it.

To chart a map: establish the destination (use `grill-me` when needed), fan out the immediate
frontier, create only the tickets that are currently specifiable, wire dependencies, then stop.
To work through it: reread the map, claim the first relevant frontier ticket, resolve and validate
it, update its index row, then create or close only the tickets revealed by that resolution.

Before ending an unfinished session, use `project-handoff`. When a resolution becomes implementable,
create an ANTS task through `write-task`; do not implement it inside the decision ticket.
