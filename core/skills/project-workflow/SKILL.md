---
name: project-workflow
description: Classify non-trivial project requests and route questions, audits, planning, bugs, implementation and merges through the skills explicitly installed in the project. Use before choosing skills or starting work on an existing task.
---

# Project Workflow

Router only: select and order existing skills; their procedures remain authoritative.

## 1 — Resolve the project and installed capabilities

Read the applicable AGENTS.md/CLAUDE.md and the local policies they reference, then
`.workflow-kit.env` and `.workflow/PROJECT_RULES.md`. Use `.workflow-kit.json` for installed
module/skill ownership when needed. Preserve local project decisions and the user's scope.
Available user-global skills or discovered catalogs do not activate project modules.

Apply installed session-start contributions once at session start. Read only the relevant
memory theme, current effort index/task or eligible handoff; never load the whole backlog.
Resume at the existing task location. Questions and audits do not require creating a task.

Classify the intent using the table below. Sequence mixed requests (e.g. implement then merge)
as separate routes; completing one does not authorize the next. For non-trivial changes,
briefly state the route, applicable skills in order, owner/invariants and verification signal.
Use [branch-router](../branch-router/SKILL.md) for branch decisions; do not infer permission
from the route. If HEAD does not exist, report it; never invent a source SHA or target branch.

## 2 — Choose the route

Module names in parentheses are conditions, not installation requests. For each selected skill,
read its project-local `.claude/skills/<name>/SKILL.md` only when needed. Resolve availability
before reading optional skill paths; see Missing capabilities below.

| Intent | Skills and order | Expected result |
|---|---|---|
| **Question** | Answer from relevant project evidence; `teach` for a requested learning session or `explain-simply` for an accessible explanation (Learning). | Answer with evidence/limits; no task or implementation implied. |
| **Audit / review** | Inspect only the requested surface. `consistency-check` for pattern audits, `novice-lens` for readability (Quality); `review-gate` for an explicitly requested independent review (Quality). | Read-only findings; no correction or implementation implied. |
| **Planning** | `branch-router` → `grill-me` for decision exploration or `wayfinder` for a multi-session initiative (Exploration, only when applicable) → applicable design gates below → `ants` → `write-task` (Tasks). | Bounded task/plan with target branch when known, invariants and observable signals; no implementation implied. |
| **Bug** | `branch-router` → `bug-triage` before diagnosis → `bug-fix-trace` for runtime confirmation and corrective work (Bugs). For authorized probes/fixes, reuse the implementation route and its gates before edits. | Reproduction status, bounded correction and regression evidence; thematic trace when Bugs is installed. A report alone does not authorize a fix. |
| **Implementation** | `branch-router` → applicable design gates below → `ants`/`write-task` for meaningful changes (Tasks; reuse the existing contract) → `validate-task` when applicable (Quality) → implementation gates below → authorized edits → technical verification → `done-check` (Quality). | Verified change with actual evidence and limits in the existing task; no review, commit or merge inferred. |
| **Merge** | `branch-router` → `review-gate` before a merge into DEFAULT_BRANCH or when independent review is requested (Quality) → explicitly authorized merge → `merge-integrity` immediately afterward (Quality). | Exact source/target/SHA and required review verdict before merge; integrity evidence afterward. Source changes invalidate review approval. |

Design gates for planning/implementation, only when Quality is installed:

- Growth with duration, item count, reconnects or lifecycle events → `soak-readiness` before
  `write-task`, `validate-task` or edits; carry its contract and overflow proof into the task.
- A performance claim → `perf-gate` before implementation; retain its fixed protocol and measurements.

Implementation gates, only when Quality is installed:

- `next-change` → `reuse` before code changes; `architect` before new/moved files or refactoring,
  `consistency-check` when introducing constructs across owning layers. Follow their design input
  before finalizing a task if it changes scope. `explicit-naming` applies to JS/TS code.
- Lifecycle ownership ambiguity → `resource-ownership`; failure propagation → `failure-containment`;
  uncertain API/type guarantees → `type-honesty`; utility replacement → `replace-not-add`.
- `tdd` for requested test-first development; `code-simplification` for clarity refactors.

An isolated change with an explicit contract skips inapplicable design/validation gates;
small diff size alone does not establish isolation. Shared state, external contracts or lifecycle
risk require the corresponding gates. `validate-task` follows its own applicability and approval
rules; an existing confirmed contract is not an excuse to skip technical verification.

## 3 — Handle missing capabilities

An absent module adds no obligation. Continue within the authorized scope with available skills
and the technical checks required by the task/project. Without Tasks, keep a concise plan and
actual evidence in the response; without Bugs, retain reproduction evidence in the existing task
or response, without inventing a bug ledger obligation. Quality being absent does not remove tests,
real integration checks or a review requirement independently imposed by local policy.

Report a missing capability when it affects the requested route or result. Never install it,
substitute a global skill, fabricate its procedure or claim its check passed. If an installed module
is missing its required skill file, or local policy requires an unavailable check, report the gap
and suspend only the dependent action; use `workflow-doctor` for suspected installation integrity.
For example, a mandatory independent review unavailable before merge prevents that merge,
while unrelated read-only analysis can continue. Never silently weaken the project contract.

## Integration proof before expansion

Identify any uncertain integration that could invalidate the solution. Prove the smallest real
end-to-end slice first; when task tracking is installed, record it as the first ANTS step.
A mock of the uncertain boundary is not runtime proof. Record outcomes and limits before expanding.
When proof fails or is unavailable, suspend dependent expansion and report the gap.
When it succeeds, continue the authorized scope. Preserve applicable lifecycle and cleanup guarantees.

## 4 — Record the result and resume safely

Apply installed task-validation contributions at validation and before-handoff contributions
before replacing a handoff. Record checks actually run and their limits; a doctor pass proves
installation integrity, not correct skill selection or native-agent behavior.
When Memory is installed, use `memory-report` only for verified reusable knowledge; reuse the
bug skill's evidence transfer instead of recording it twice. When Continuity is installed,
use `context-relay` at its trigger and `project-handoff` before ending unfinished work.
Honor Reporting's installed contributions; use `weekly-report` only for its reporting action.
Never claim review or commit from implementation alone; never start an unrelated effort automatically.
No route authorizes launching agents, creating/switching branches, committing, pushing, merging
or publishing. Keep existing user authorization for its exact scope; do not ask again mechanically.
