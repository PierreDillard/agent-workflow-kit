---
name: memory-report
description: Promote only proven reusable findings into branch or project memory while keeping raw evidence in its canonical task or bug record.
---

# Memory Report

Read only the evidence named by the invoking task: a bug entry, test, diff or current handoff.
Never scan all memories or bugs for context.

Return one explicit verdict:

- `NO_PROMOTION`: local fact already retained by its task or bug record.
- `PROMOTE: branch`: verified guidance useful while the current branch lives; append one concise
  rule to `${TASKS_DIR}/memory/<branch-with-slashes-as-dashes>.md`.
- `PROMOTE: project`: a verified invariant or prevention rule that applies across branches; upsert
  one concise rule in the matching thematic memory linked from `${TASKS_DIR}/PROJECT_MEMORY.md`.

`NO_PROMOTION` is the normal outcome for a local incident. A hypothesis, raw log, stack trace or
restatement of a bug record is never promotable.

For a promotion, identify the logical subject before writing. Replace a superseded rule, remove
obsolete contradictions and merge duplicates; add a rule only when no current rule covers it.
Promoted rules link to their evidence instead of copying logs or narratives. Create a project memory
theme only when none fits, then add one pointer to the project-memory index. Branch memory never
overrides project memory; conflicts require an explicit decision.

Memory is a current set of reusable rules, not a chronology. Remove a rule when its premise, API or
prevention mechanism no longer applies; retain history in its cited commit, test, task or bug trace.
