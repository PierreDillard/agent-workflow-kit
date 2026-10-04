---
name: bug-triage
description: Triage a reported defect by observable impact, reproducibility, ownership and existing thematic evidence before diagnosis or implementation.
---

# Bug Triage

1. Restate the observable failure without claiming a cause.
2. Search `${TASKS_DIR}/bugs/README.md` and only the matching theme for duplicates.
3. Record severity (`blocking`, `high`, `normal`, `low`), reproducibility and affected interface.
4. Identify the likely owner and the smallest runtime probe that separates competing hypotheses.
5. Route confirmed work to `bug-fix-trace`; leave unconfirmed reports as triage entries.

Classify by durable theme, never by branch. A branch is provenance, not ownership. Create a new
theme only when no existing row fits, then add it to the bug index.

Never turn source reading into a confirmed root cause. Report `unconfirmed`, `reproduced`, or
`confirmed by runtime` explicitly.
